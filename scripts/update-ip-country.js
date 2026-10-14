import { gunzipSync } from "node:zlib";
import { getDatabase } from "../lib/database.js";

const db = getDatabase();
if (process.argv.includes("--if-missing")) {
  const existingRanges = db.prepare("SELECT 1 FROM ip_country_ranges LIMIT 1").get();
  if (existingRanges) {
    console.log("IP country ranges are already installed; skipping initial import.");
    process.exit(0);
  }
}

function getReleaseCandidates() {
  const now = new Date();
  return [0, 1, 2].map((monthsAgo) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
    return date.toISOString().slice(0, 7);
  });
}
const countryTableSql = `
  CREATE TABLE IF NOT EXISTS ip_country_ranges (
    ip_version INTEGER NOT NULL CHECK (ip_version IN (4, 6)),
    start_ip TEXT NOT NULL,
    end_ip TEXT NOT NULL,
    country TEXT NOT NULL,
    PRIMARY KEY (ip_version, start_ip)
  );
`;

function toIpNumber(address) {
  const octets = address.split(".").map(Number);
  if (octets.length === 4 && octets.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
    const value = octets.reduce((acc, part) => acc * 256n + BigInt(part), 0n);
    return { version: 4, value: value.toString().padStart(10, "0") };
  }

  const halves = address.toLowerCase().split("::");
  if (halves.length > 2) throw new Error(`Invalid IPv6 address: ${address}`);
  const parse = (half) => half ? half.split(":") : [];
  const left = parse(halves[0]);
  const right = parse(halves[1] ?? "");
  const missing = 8 - left.length - right.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) throw new Error(`Invalid IPv6 address: ${address}`);
  const groups = [...left, ...Array(missing).fill("0"), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[\da-f]{1,4}$/.test(group))) {
    throw new Error(`Invalid IPv6 address: ${address}`);
  }
  const value = groups.reduce((acc, group) => acc * 65536n + BigInt(`0x${group || "0"}`), 0n);
  return { version: 6, value: value.toString().padStart(39, "0") };
}

let release;
let compressed;
for (const candidate of getReleaseCandidates()) {
  const url = `https://download.db-ip.com/free/dbip-country-lite-${candidate}.csv.gz`;
  console.log(`Trying DB-IP country ranges for ${candidate}...`);
  const response = await fetch(url);
  if (response.ok) {
    release = candidate;
    compressed = Buffer.from(await response.arrayBuffer());
    break;
  }
}
if (!compressed) throw new Error("Unable to download a recent DB-IP country range release.");
console.log(`Importing DB-IP country ranges for ${release}...`);
const csv = gunzipSync(compressed).toString("utf8");
const rows = csv.trim().split(/\r?\n/).map((line) => {
  const [start, end, country] = line.split(",");
  if (!/^[A-Z]{2}$/.test(country)) throw new Error(`Invalid country record: ${line}`);
  const startIp = toIpNumber(start);
  const endIp = toIpNumber(end);
  if (startIp.version !== endIp.version) throw new Error(`Mismatched IP range: ${line}`);
  return [startIp.version, startIp.value, endIp.value, country];
});

if (rows.length < 100_000) {
  throw new Error(`Downloaded country range file appears incomplete (${rows.length} rows)`);
}

db.exec(countryTableSql);
db.exec("DROP TABLE IF EXISTS ip_country_ranges_next");
db.exec(countryTableSql.replaceAll("ip_country_ranges", "ip_country_ranges_next"));
const insert = db.prepare("INSERT INTO ip_country_ranges_next (ip_version, start_ip, end_ip, country) VALUES (?, ?, ?, ?)");
const transaction = db.transaction((records) => {
  for (const record of records) insert.run(...record);
});
transaction(rows);
db.transaction(() => {
  db.exec("DROP TABLE ip_country_ranges");
  db.exec("ALTER TABLE ip_country_ranges_next RENAME TO ip_country_ranges");
})();
db.exec("CREATE INDEX IF NOT EXISTS idx_ip_country_range_start ON ip_country_ranges(ip_version, start_ip)");
console.log(`Imported ${rows.length.toLocaleString()} DB-IP country ranges.`);
process.exit(0);

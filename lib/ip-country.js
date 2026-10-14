const IPV4_MAPPED_PREFIX = "00000000000000000000ffff";

function expandIPv6(address) {
  const normalized = address.toLowerCase().split("%")[0];
  const halves = normalized.split("::");
  if (halves.length > 2) return null;

  const parseHalf = (half) => {
    if (!half) return [];
    const groups = half.split(":");
    const last = groups.at(-1);
    if (last?.includes(".")) {
      const octets = last.split(".").map(Number);
      if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
      groups.splice(-1, 1, ((octets[0] << 8) | octets[1]).toString(16), ((octets[2] << 8) | octets[3]).toString(16));
    }
    if (groups.some((group) => !/^[\da-f]{1,4}$/i.test(group))) return null;
    return groups;
  };

  const left = parseHalf(halves[0]);
  const right = parseHalf(halves[1] ?? "");
  if (!left || !right) return null;
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  const groups = [...left, ...Array(missing).fill("0"), ...right];
  if (groups.length !== 8) return null;
  return groups.map((group) => Number.parseInt(group, 16).toString(16).padStart(4, "0")).join("");
}

export function normalizeIpAddress(address) {
  if (typeof address !== "string") return null;
  let ip = address.trim();
  if (ip.startsWith("[") && ip.includes("]")) ip = ip.slice(1, ip.indexOf("]"));
  if (ip.toLowerCase().startsWith("::ffff:")) {
    const mapped = ip.slice(7);
    if (mapped.includes(".")) ip = mapped;
  }

  const octets = ip.split(".");
  if (octets.length === 4 && octets.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)) {
    const numbers = octets.map(Number);
    const value = numbers.reduce((acc, octet) => acc * 256 + octet, 0);
    return { version: 4, value: BigInt(value).toString().padStart(10, "0"), normalized: numbers.join(".") };
  }

  const expanded = expandIPv6(ip);
  if (!expanded) return null;
  if (expanded.startsWith(IPV4_MAPPED_PREFIX)) {
    const last = expanded.slice(IPV4_MAPPED_PREFIX.length);
    const value = BigInt(`0x${last}`);
    return {
      version: 4,
      value: value.toString().padStart(10, "0"),
      normalized: [24n, 16n, 8n, 0n].map((shift) => Number((value >> shift) & 255n)).join("."),
    };
  }

  return { version: 6, value: BigInt(`0x${expanded}`).toString().padStart(39, "0"), normalized: ip };
}

export function lookupIpCountry(db, address) {
  const ip = normalizeIpAddress(address);
  if (!ip) return null;

  const row = db.prepare(`
    SELECT country, end_ip
    FROM ip_country_ranges
    WHERE ip_version = ? AND start_ip <= ?
    ORDER BY start_ip DESC
    LIMIT 1
  `).get(ip.version, ip.value);

  if (!row || row.end_ip < ip.value || row.country === "ZZ") return null;
  return row.country;
}

export function isPublicIp(address) {
  const ip = normalizeIpAddress(address);
  if (!ip) return false;

  if (ip.version === 4) {
    const [a, b] = ip.normalized.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) || (a === 192 && b === 168) || a >= 224);
  }

  const value = BigInt(ip.value);
  const firstByte = Number((value >> 120n) & 255n);
  const first16 = Number((value >> 112n) & 65535n);
  return value !== 0n && value !== 1n && firstByte !== 0xff &&
    (first16 & 0xfe00) !== 0xfc00 && (first16 & 0xffc0) !== 0xfe80;
}

export function formatCountryName(countryCode, locale = "en") {
  if (!countryCode) return null;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}

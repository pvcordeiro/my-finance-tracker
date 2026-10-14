import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import {
  formatCountryName,
  isPublicIp,
  lookupIpCountry,
  normalizeIpAddress,
} from "./ip-country.js";

describe("IP country lookup", () => {
  test("looks up IPv4 ranges using numeric address ordering", () => {
    const db = new Database(":memory:");
    db.exec(`CREATE TABLE ip_country_ranges (
      ip_version INTEGER NOT NULL,
      start_ip TEXT NOT NULL,
      end_ip TEXT NOT NULL,
      country TEXT NOT NULL
    )`);
    db.query("INSERT INTO ip_country_ranges VALUES (?, ?, ?, ?)").run(
      4,
      "0016777216",
      "0016777471",
      "US"
    );

    expect(lookupIpCountry(db, "1.0.0.42")).toBe("US");
    expect(lookupIpCountry(db, "1.0.1.0")).toBeNull();
    db.close();
  });

  test("normalizes IPv6 and IPv4-mapped IPv6, and excludes private IPs", () => {
    expect(normalizeIpAddress("2001:4860:4860::8888")?.version).toBe(6);
    expect(normalizeIpAddress("::ffff:8.8.8.8")).toMatchObject({
      version: 4,
      normalized: "8.8.8.8",
    });
    expect(isPublicIp("127.0.0.1")).toBe(false);
    expect(isPublicIp("192.168.1.10")).toBe(false);
    expect(isPublicIp("::1")).toBe(false);
    expect(isPublicIp("8.8.8.8")).toBe(true);
    expect(isPublicIp("2001:4860:4860::8888")).toBe(true);
  });

  test("formats country names and ignores unassigned range markers", () => {
    expect(formatCountryName("US", "en")).toBe("United States");

    const db = new Database(":memory:");
    db.exec(`CREATE TABLE ip_country_ranges (
      ip_version INTEGER NOT NULL,
      start_ip TEXT NOT NULL,
      end_ip TEXT NOT NULL,
      country TEXT NOT NULL
    )`);
    db.query("INSERT INTO ip_country_ranges VALUES (?, ?, ?, ?)").run(
      4,
      "0000000000",
      "0000000255",
      "ZZ"
    );
    expect(lookupIpCountry(db, "0.0.0.1")).toBeNull();
    db.close();
  });
});

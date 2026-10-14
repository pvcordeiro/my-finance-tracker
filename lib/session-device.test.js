import { describe, expect, test } from "bun:test";
import { getDeviceNameFromHeaders } from "./session.js";

describe("session device identification", () => {
  test("uses device model hints when available for Android phones", () => {
    expect(getDeviceNameFromHeaders({
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 Mobile",
      model: '"Pixel 8 Pro"',
      platform: '"Android"',
    })).toBe("Android phone (Pixel 8 Pro)");
  });

  test("falls back to a useful device class without revealing a model", () => {
    expect(getDeviceNameFromHeaders({
      userAgent: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Mobile",
    })).toBe("Android phone");
    expect(getDeviceNameFromHeaders({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    })).toBe("iPhone");
    expect(getDeviceNameFromHeaders({
      userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
    })).toBe("iPad");
  });

  test("preserves desktop platform labels", () => {
    expect(getDeviceNameFromHeaders({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" })).toBe("Windows PC");
    expect(getDeviceNameFromHeaders({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" })).toBe("Mac");
  });
});

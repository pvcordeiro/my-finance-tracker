import { getDatabase } from "./database.js";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
}

export function rateLimit(identifier: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const db = getDatabase();
  const check = db.transaction(() => {
    db.prepare("DELETE FROM rate_limits WHERE reset_at <= ?").run(now);
    const existing = db.prepare("SELECT count, reset_at FROM rate_limits WHERE bucket_key = ?").get(identifier) as { count: number; reset_at: number } | undefined;
    if (!existing) {
      db.prepare("INSERT INTO rate_limits (bucket_key, count, reset_at) VALUES (?, 1, ?)").run(identifier, now + config.windowMs);
      return true;
    }
    if (existing.count >= config.maxRequests) return false;
    db.prepare("UPDATE rate_limits SET count = count + 1 WHERE bucket_key = ?").run(identifier);
    return true;
  });
  return check();
}

export function rateLimitStatus(identifier: string, config: RateLimitConfig): { allowed: boolean; retryAfter: number } {
  const allowed = rateLimit(identifier, config);
  if (allowed) return { allowed: true, retryAfter: 0 };
  const row = getDatabase().prepare("SELECT reset_at FROM rate_limits WHERE bucket_key = ?").get(identifier) as { reset_at: number } | undefined;
  return { allowed: false, retryAfter: Math.max(1, Math.ceil(((row?.reset_at || Date.now()) - Date.now()) / 1000)) };
}

export function getClientIp(request: Request): string {
  if (process.env.TRUST_PROXY !== "true") return request.headers.get("x-real-ip") || "direct";
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  return forwarded?.split(",")[0].trim() || realIp || "unknown";
}

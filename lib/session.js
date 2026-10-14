import crypto from "crypto";
import { getDatabase } from "./database.js";

const SESSION_TIMEOUT = 7 * 24 * 60 * 60 * 1000;
const SESSION_COOKIE_NAME = "finance-session";
const UNEXPIRED_TIMESTAMP = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

export function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function getDeviceNameFromHeaders({ userAgent = "Unknown", model = "", platform = "" } = {}) {
  const normalizedAgent = userAgent.toLowerCase();
  const normalizedPlatform = platform.replaceAll('"', "").toLowerCase();
  const safeModel = model
    .replaceAll('"', "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 60);

  if (/ipad/.test(normalizedAgent) || normalizedPlatform === "ipados") return "iPad";
  if (/iphone|ipod/.test(normalizedAgent) || normalizedPlatform === "ios") return "iPhone";
  if (normalizedAgent.includes("android")) {
    const isTablet = !normalizedAgent.includes("mobile");
    const deviceType = isTablet ? "Android tablet" : "Android phone";
    return safeModel && safeModel.toLowerCase() !== "unknown"
      ? `${deviceType} (${safeModel})`
      : deviceType;
  }
  if (normalizedAgent.includes("windows")) return "Windows PC";
  if (normalizedAgent.includes("macintosh") || normalizedPlatform === "macos") return "Mac";
  if (normalizedAgent.includes("linux")) return "Linux PC";
  return "Unknown Device";
}

export function getDeviceInfo(request) {
  const userAgent = request.headers.get("user-agent") || "Unknown";
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "Unknown";

  const deviceName = getDeviceNameFromHeaders({
    userAgent,
    model: request.headers.get("sec-ch-ua-model") || "",
    platform: request.headers.get("sec-ch-ua-platform") || "",
  });

  return { userAgent, ipAddress, deviceName };
}

export function isPrivateIP(ip) {
  if (!ip || ip === "unknown") return false;

  if (ip.includes("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }

  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false;

  if (parts[0] === 127) return true;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;

  return false;
}

export function createSession(userId, deviceInfo = {}) {
  const db = getDatabase();
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TIMEOUT);

  const userPreferredGroup = db.prepare(`
    SELECT group_id FROM (
      SELECT u.last_selected_group_id as group_id, 0 as priority
      FROM users u
      JOIN user_groups ug ON u.last_selected_group_id = ug.group_id AND u.id = ug.user_id
      WHERE u.id = ? AND u.last_selected_group_id IS NOT NULL
      UNION
      SELECT ug.group_id, 1 as priority
      FROM user_groups ug
      WHERE ug.user_id = ?
    ) ORDER BY priority ASC, group_id ASC LIMIT 1
  `).get(userId, userId);

  db.prepare(
    `INSERT INTO sessions (token, user_id, current_group_id, expires_at, created_at, user_agent, ip_address, device_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    sessionToken,
    userId,
    userPreferredGroup?.group_id ?? null,
    expiresAt.toISOString(),
    new Date().toISOString(),
    deviceInfo.userAgent ?? null,
    deviceInfo.ipAddress ?? null,
    deviceInfo.deviceName ?? null
  );

  return sessionToken;
}

export function validateSession(sessionToken) {
  if (!sessionToken) {
    return null;
  }

  const db = getDatabase();

  const sessionData = db.prepare(`
    SELECT s.*, u.id as user_id, u.username, u.is_admin, u.accent_color, u.theme_preference, u.language, u.currency, u.minimum_balance_alert, u.tour_completed, u.admin_tour_completed
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > ${UNEXPIRED_TIMESTAMP}
  `).get(sessionToken);

  if (!sessionData) {
    return null;
  }

  const userGroups = db.prepare(`
    SELECT ug.group_id, g.name
    FROM user_groups ug
    JOIN groups g ON ug.group_id = g.id
    WHERE ug.user_id = ?
    ORDER BY ug.joined_at ASC
  `).all(sessionData.user_id) ?? [];

  // Group choice is an account preference, not a per-device preference.
  // Refresh it from the user row so all active devices converge on the latest choice.
  const preferredGroup = db.prepare(
    `SELECT last_selected_group_id FROM users WHERE id = ?`
  ).get(sessionData.user_id)?.last_selected_group_id;
  let currentGroupId = preferredGroup ?? sessionData.current_group_id;
  if (
    currentGroupId &&
    !userGroups.some((g) => g.group_id === currentGroupId)
  ) {
    currentGroupId = userGroups.length > 0 ? userGroups[0].group_id : null;
    db.prepare(`UPDATE users SET last_selected_group_id = ? WHERE id = ?`).run(currentGroupId, sessionData.user_id);
  }

  if (!currentGroupId && userGroups.length > 0) {
    currentGroupId = userGroups[0].group_id;
    db.prepare(`UPDATE users SET last_selected_group_id = ? WHERE id = ?`).run(currentGroupId, sessionData.user_id);
  }

  if (currentGroupId !== sessionData.current_group_id) {
    db.prepare(`UPDATE sessions SET current_group_id = ? WHERE user_id = ? AND expires_at > ${UNEXPIRED_TIMESTAMP}`).run(currentGroupId, sessionData.user_id);
  }

  db.prepare(
    `UPDATE sessions SET last_accessed = datetime('now') WHERE token = ?`
  ).run(sessionToken);

  return {
    id: sessionData.user_id,
    username: sessionData.username,
    is_admin: sessionData.is_admin || false,
    accent_color: sessionData.accent_color || "blue",
    theme_preference: sessionData.theme_preference || "system",
    groups: userGroups,
    current_group_id: currentGroupId,
    sessionToken: sessionData.token,
    language: sessionData.language,
    currency: sessionData.currency,
    minimum_balance_alert: sessionData.minimum_balance_alert,
    tour_completed: Boolean(sessionData.tour_completed),
    admin_tour_completed: Boolean(sessionData.admin_tour_completed),
  };
}

export function switchGroup(sessionToken, groupId) {
  const db = getDatabase();

  const session = db.prepare(`
    SELECT s.user_id
    FROM sessions s
    JOIN user_groups ug ON s.user_id = ug.user_id
    WHERE s.token = ? AND s.expires_at > ${UNEXPIRED_TIMESTAMP} AND ug.group_id = ?
  `).get(sessionToken, groupId);

  if (!session) {
    throw new Error("Invalid session or group access");
  }

  db.prepare(
    `UPDATE sessions SET current_group_id = ? WHERE user_id = ? AND expires_at > ${UNEXPIRED_TIMESTAMP}`
  ).run(groupId, session.user_id);

  db.prepare(
    `UPDATE users SET last_selected_group_id = ? WHERE id = ?`
  ).run(groupId, session.user_id);

  return true;
}

export function deleteSession(sessionToken) {
  if (!sessionToken) {
    return;
  }

  const db = getDatabase();
  db.prepare("DELETE FROM sessions WHERE token = ?").run(sessionToken);
}

export function cleanupExpiredSessions() {
  const db = getDatabase();
  db.prepare(
    `DELETE FROM sessions WHERE expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
  ).run();
}

export function getSessionCookieOptions(
  isSecure = process.env.NODE_ENV === "production"
) {
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: SESSION_TIMEOUT / 1000,
    path: "/",
  };
}

export function createSecureSessionCookie(request, response, token) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const secure = process.env.NODE_ENV === "production" || request.nextUrl?.protocol === "https:" || forwardedProto === "https";
  response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions(secure));
}

export function verifyRequestOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    if (originUrl.origin === requestUrl.origin) return true;
    if (process.env.TRUST_PROXY === "true") {
      const publicAppUrl = process.env.APP_URL;
      if (publicAppUrl && originUrl.origin === new URL(publicAppUrl).origin) return true;
    }
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
    return Boolean(forwardedHost && forwardedProto && originUrl.host === forwardedHost && originUrl.protocol === `${forwardedProto}:`);
  } catch {
    return false;
  }
}

export function getSessionFromRequest(request) {
  const cookies = request.headers.get("cookie");
  if (!cookies) {
    return null;
  }

  const sessionCookie = cookies
    .split(";")
    .find((cookie) => cookie.trim().startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!sessionCookie) {
    return null;
  }

  return sessionCookie.split("=").slice(1).join("=");
}

export { SESSION_COOKIE_NAME };

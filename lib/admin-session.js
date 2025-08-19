import crypto from "crypto";
import { getDatabase } from "./database.js";

// Admin session configuration
const ADMIN_SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
const ADMIN_SESSION_COOKIE_NAME = "admin-session";

/**
 * Generate a secure admin session token
 */
export function generateAdminSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a new admin session
 */
export function createAdminSession() {
  const db = getDatabase();
  const sessionToken = generateAdminSessionToken();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TIMEOUT);

  // Clean up any existing admin sessions (only one admin session at a time)
  db.prepare(
    "DELETE FROM admin_sessions WHERE expires_at <= datetime('now')"
  ).run();

  // Create new admin session
  db.prepare(
    `
    INSERT INTO admin_sessions (token, expires_at, created_at)
    VALUES (?, ?, ?)
  `
  ).run(sessionToken, expiresAt.toISOString(), new Date().toISOString());

  return sessionToken;
}

/**
 * Validate an admin session token
 */
export function validateAdminSession(sessionToken) {
  if (!sessionToken) {
    return null;
  }

  const db = getDatabase();

  // Get admin session
  const session = db
    .prepare(
      `
    SELECT * FROM admin_sessions
    WHERE token = ? AND expires_at > datetime('now')
  `
    )
    .get(sessionToken);

  if (!session) {
    return null;
  }

  // Update last accessed time
  db.prepare(
    `
    UPDATE admin_sessions 
    SET last_accessed = datetime('now')
    WHERE token = ?
  `
  ).run(sessionToken);

  return {
    isAdmin: true,
    sessionToken: session.token,
  };
}

/**
 * Delete an admin session (logout)
 */
export function deleteAdminSession(sessionToken) {
  if (!sessionToken) {
    return;
  }

  const db = getDatabase();
  db.prepare("DELETE FROM admin_sessions WHERE token = ?").run(sessionToken);
}

/**
 * Clean up expired admin sessions
 */
export function cleanupExpiredAdminSessions() {
  const db = getDatabase();
  db.prepare(
    `DELETE FROM admin_sessions WHERE expires_at <= datetime('now')`
  ).run();
}

/**
 * Get admin session cookie options
 */
export function getAdminSessionCookieOptions(
  isSecure = process.env.NODE_ENV === "production"
) {
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: ADMIN_SESSION_TIMEOUT / 1000, // Convert to seconds
    path: "/",
  };
}

/**
 * Extract admin session token from request cookies
 */
export function getAdminSessionFromRequest(request) {
  const cookies = request.headers.get("cookie");
  if (!cookies) {
    return null;
  }

  const sessionCookie = cookies
    .split(";")
    .find((cookie) =>
      cookie.trim().startsWith(`${ADMIN_SESSION_COOKIE_NAME}=`)
    );

  if (!sessionCookie) {
    return null;
  }

  return sessionCookie.split("=")[1];
}

export { ADMIN_SESSION_COOKIE_NAME };

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
export async function createAdminSession() {
  const db = await getDatabase();
  const sessionToken = generateAdminSessionToken();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TIMEOUT);

  // Clean up any existing admin sessions (only one admin session at a time)
  await new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM admin_sessions WHERE expires_at <= datetime('now')",
      [],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  // Create new admin session
  await new Promise((resolve, reject) => {
    db.run(
      `
        INSERT INTO admin_sessions (token, expires_at, created_at)
        VALUES (?, ?, ?)
      `,
      [sessionToken, expiresAt.toISOString(), new Date().toISOString()],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  return sessionToken;
}

/**
 * Validate an admin session token
 */
export async function validateAdminSession(sessionToken) {
  if (!sessionToken) {
    return null;
  }

  const db = await getDatabase();

  // Get admin session
  const session = await new Promise((resolve, reject) => {
    db.get(
      `
        SELECT * FROM admin_sessions
        WHERE token = ? AND expires_at > datetime('now')
      `,
      [sessionToken],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!session) {
    return null;
  }

  // Update last accessed time
  await new Promise((resolve, reject) => {
    db.run(
      `
        UPDATE admin_sessions
        SET last_accessed = datetime('now')
        WHERE token = ?
      `,
      [sessionToken],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  return {
    isAdmin: true,
    sessionToken: session.token,
  };
}

/**
 * Delete an admin session (logout)
 */
export async function deleteAdminSession(sessionToken) {
  if (!sessionToken) {
    return;
  }

  const db = await getDatabase();
  await new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM admin_sessions WHERE token = ?",
      [sessionToken],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

/**
 * Clean up expired admin sessions
 */
export async function cleanupExpiredAdminSessions() {
  const db = await getDatabase();
  await new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM admin_sessions WHERE expires_at <= datetime('now')`,
      [],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
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

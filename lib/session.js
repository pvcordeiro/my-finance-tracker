import crypto from "crypto";
import { getDatabase } from "./database.js";

// Session configuration
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const SESSION_COOKIE_NAME = "finance-session";

/**
 * Generate a secure session token
 */
export function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a new session for a user
 */
export async function createSession(userId) {
  const db = await getDatabase();
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TIMEOUT);

  // Clean up any existing sessions for this user (optional - for single session per user)
  await new Promise((resolve, reject) => {
    db.run("DELETE FROM sessions WHERE user_id = ?", [userId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Create new session
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`,
      [sessionToken, userId, expiresAt.toISOString(), new Date().toISOString()],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  return sessionToken;
}

/**
 * Validate a session token and return user data if valid
 */
export async function validateSession(sessionToken) {
  if (!sessionToken) {
    return null;
  }

  const db = await getDatabase();

  // Get session with user data
  const session = await new Promise((resolve, reject) => {
    db.get(
      `
        SELECT s.*, u.id as user_id, u.username, u.is_admin, ug.group_id
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN user_groups ug ON u.id = ug.user_id
        WHERE s.token = ? AND s.expires_at > datetime('now')
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
      `UPDATE sessions SET last_accessed = datetime('now') WHERE token = ?`,
      [sessionToken],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  return {
    id: session.user_id,
    username: session.username,
    is_admin: session.is_admin || false,
    group_id: session.group_id || null,
    sessionToken: session.token,
  };
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(sessionToken) {
  if (!sessionToken) {
    return;
  }

  const db = await getDatabase();
  await new Promise((resolve, reject) => {
    db.run("DELETE FROM sessions WHERE token = ?", [sessionToken], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions() {
  const db = await getDatabase();
  await new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM sessions WHERE expires_at <= datetime('now')`,
      [],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

/**
 * Get session cookie options
 */
export function getSessionCookieOptions(
  isSecure = process.env.NODE_ENV === "production"
) {
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: SESSION_TIMEOUT / 1000, // Convert to seconds
    path: "/",
  };
}

/**
 * Extract session token from request cookies
 */
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

  return sessionCookie.split("=")[1];
}

export { SESSION_COOKIE_NAME };

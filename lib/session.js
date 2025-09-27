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

  // Get user's first group to set as current
  const userGroup = await new Promise((resolve, reject) => {
    db.get(
      "SELECT group_id FROM user_groups WHERE user_id = ? ORDER BY joined_at ASC LIMIT 1",
      [userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  // Create new session
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO sessions (token, user_id, current_group_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`,
      [
        sessionToken,
        userId,
        userGroup?.group_id || null,
        expiresAt.toISOString(),
        new Date().toISOString(),
      ],
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

  // Get session with user data and groups
  const sessionData = await new Promise((resolve, reject) => {
    db.get(
      `
        SELECT s.*, u.id as user_id, u.username, u.is_admin
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > datetime('now')
      `,
      [sessionToken],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!sessionData) {
    return null;
  }

  // Get all groups for this user
  const userGroups = await new Promise((resolve, reject) => {
    db.all(
      `
        SELECT ug.group_id, g.name
        FROM user_groups ug
        JOIN groups g ON ug.group_id = g.id
        WHERE ug.user_id = ?
        ORDER BY ug.joined_at ASC
      `,
      [sessionData.user_id],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });

  // Check if current_group_id is still valid (user still has access to it)
  let currentGroupId = sessionData.current_group_id;
  if (
    currentGroupId &&
    !userGroups.some((g) => g.group_id === currentGroupId)
  ) {
    // Current group is no longer accessible, set to first available group
    currentGroupId = userGroups.length > 0 ? userGroups[0].group_id : null;

    // Update the session with the new current_group_id
    if (currentGroupId !== sessionData.current_group_id) {
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE sessions SET current_group_id = ? WHERE token = ?`,
          [currentGroupId, sessionToken],
          function (err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }
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
    id: sessionData.user_id,
    username: sessionData.username,
    is_admin: sessionData.is_admin || false,
    groups: userGroups,
    current_group_id: currentGroupId,
    sessionToken: sessionData.token,
  };
}

/**
 * Switch the current active group for a session
 */
export async function switchGroup(sessionToken, groupId) {
  const db = await getDatabase();

  // Verify the session exists and the user has access to this group
  const session = await new Promise((resolve, reject) => {
    db.get(
      `
        SELECT s.user_id
        FROM sessions s
        JOIN user_groups ug ON s.user_id = ug.user_id
        WHERE s.token = ? AND s.expires_at > datetime('now') AND ug.group_id = ?
      `,
      [sessionToken, groupId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!session) {
    throw new Error("Invalid session or group access");
  }

  // Update the current group
  await new Promise((resolve, reject) => {
    db.run(
      `UPDATE sessions SET current_group_id = ? WHERE token = ?`,
      [groupId, sessionToken],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  return true;
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

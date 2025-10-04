import crypto from "crypto";
import { getDatabase } from "./database.js";

const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;
const SESSION_COOKIE_NAME = "finance-session";

export function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId) {
  const db = await getDatabase();
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TIMEOUT);

  await new Promise((resolve, reject) => {
    db.run("DELETE FROM sessions WHERE user_id = ?", [userId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const userPreferredGroup = await new Promise((resolve, reject) => {
    db.get(
      `SELECT group_id FROM (
        SELECT u.last_selected_group_id as group_id, 0 as priority
        FROM users u
        JOIN user_groups ug ON u.last_selected_group_id = ug.group_id AND u.id = ug.user_id
        WHERE u.id = ? AND u.last_selected_group_id IS NOT NULL
        UNION
        SELECT ug.group_id, 1 as priority
        FROM user_groups ug
        WHERE ug.user_id = ?
      ) ORDER BY priority ASC, group_id ASC LIMIT 1`,
      [userId, userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO sessions (token, user_id, current_group_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`,
      [
        sessionToken,
        userId,
        userPreferredGroup?.group_id || null,
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

export async function validateSession(sessionToken) {
  if (!sessionToken) {
    return null;
  }

  const db = await getDatabase();

  const sessionData = await new Promise((resolve, reject) => {
    db.get(
      `
        SELECT s.*, u.id as user_id, u.username, u.is_admin, u.accent_color
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

  let currentGroupId = sessionData.current_group_id;
  if (
    currentGroupId &&
    !userGroups.some((g) => g.group_id === currentGroupId)
  ) {
    currentGroupId = userGroups.length > 0 ? userGroups[0].group_id : null;

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
    accent_color: sessionData.accent_color || "blue",
    groups: userGroups,
    current_group_id: currentGroupId,
    sessionToken: sessionData.token,
  };
}

export async function switchGroup(sessionToken, groupId) {
  const db = await getDatabase();

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

  await new Promise((resolve, reject) => {
    db.run(
      `UPDATE users SET last_selected_group_id = ? WHERE id = ?`,
      [groupId, session.user_id],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  return true;
}

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

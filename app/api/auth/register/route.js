import { NextResponse } from "next/server";
import { getDatabase, hashPassword } from "../../../../lib/database.js";
import { registerSchema } from "../../../../lib/validations.ts";
import { rateLimit, getClientIp } from "../../../../lib/rate-limit.ts";
import {
  createSession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  getDeviceInfo,
} from "../../../../lib/session.js";

export async function POST(request) {
  try {
    const db = await getDatabase();
    const registrationSetting = await new Promise((resolve, reject) => {
      db.get(
        "SELECT value FROM settings WHERE key = 'allow_registration'",
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!registrationSetting || registrationSetting.value !== "true") {
      return NextResponse.json(
        { error: "Account registration is currently disabled" },
        { status: 403 }
      );
    }

    const clientIp = getClientIp(request);
    if (
      !rateLimit(`register_${clientIp}`, {
        maxRequests: 3,
        windowMs: 60 * 60 * 1000,
      })
    ) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();

    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { username, password } = validation.data;

    const existingUser = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM users WHERE username = ?",
        [username],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = hashPassword(password);

    const userId = await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)",
        [username, hashedPassword],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    const groupName = `${username}'s group`;
    const groupId = await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO groups (name, created_by) VALUES (?, ?)",
        [groupName, userId],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)",
        [userId, groupId],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    const deviceInfo = getDeviceInfo(request);
    const sessionToken = await createSession(userId, deviceInfo);

    const groups = await new Promise((resolve, reject) => {
      db.all(
        `SELECT ug.group_id, g.name
         FROM user_groups ug
         JOIN groups g ON ug.group_id = g.id
         WHERE ug.user_id = ?
         ORDER BY ug.joined_at ASC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    const current_group_id = groups.length > 0 ? groups[0].group_id : null;

    const response = NextResponse.json({
      user: { id: userId, username, groups, current_group_id },
      message: "User created successfully",
    });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      sessionToken,
      getSessionCookieOptions()
    );

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

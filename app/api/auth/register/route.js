import { NextResponse } from "next/server";
import { getDatabase, hashPassword } from "../../../../lib/database.js";
import { registerSchema } from "../../../../lib/validations.ts";
import { rateLimit, getClientIp } from "../../../../lib/rate-limit.ts";
import {
  createSession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  getDeviceInfo,
  isPrivateIP,
} from "../../../../lib/session.js";

export async function POST(request) {
  try {
    const db = getDatabase();
    const registrationSetting = db.prepare(
      "SELECT value FROM settings WHERE key = 'allow_registration'"
    ).get();

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

    const {
      username,
      password,
      language = "en",
      currency = "EUR",
    } = validation.data;

    const existingUser = db.prepare(
      "SELECT id FROM users WHERE username = ?"
    ).get(username);
    if (existingUser) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 409 }
      );
    }

    const hashedPassword = hashPassword(password);

    const userResult = db.prepare(
      "INSERT INTO users (username, password_hash, language, currency) VALUES (?, ?, ?, ?)"
    ).run(username, hashedPassword, language, currency);
    const userId = userResult.lastInsertRowid;

    const groupName = `${username}'s group`;
    const groupResult = db.prepare(
      "INSERT INTO groups (name, created_by) VALUES (?, ?)"
    ).run(groupName, userId);
    const groupId = groupResult.lastInsertRowid;

    db.prepare(
      "INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)"
    ).run(userId, groupId);

    const deviceInfo = getDeviceInfo(request);
    const sessionToken = createSession(userId, deviceInfo);

    const groups = db.prepare(
      `SELECT ug.group_id, g.name
       FROM user_groups ug
       JOIN groups g ON ug.group_id = g.id
       WHERE ug.user_id = ?
       ORDER BY ug.joined_at ASC`
    ).all(userId) ?? [];

    const current_group_id = groups.length > 0 ? groups[0].group_id : null;

    const response = NextResponse.json({
      user: { id: userId, username, groups, current_group_id },
      message: "User created successfully",
    });

    const isSecure =
      request.nextUrl.protocol === "https:" || !isPrivateIP(clientIp);
    response.cookies.set(
      SESSION_COOKIE_NAME,
      sessionToken,
      getSessionCookieOptions(isSecure)
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

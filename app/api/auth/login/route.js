import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDatabase } from "../../../../lib/database.js";
import { loginSchema } from "../../../../lib/validations.ts";
import { rateLimit, getClientIp } from "../../../../lib/rate-limit.ts";
import {
  createSession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  getDeviceInfo,
} from "../../../../lib/session.js";

export async function POST(request) {
  try {
    const clientIp = getClientIp(request);
    if (!rateLimit(clientIp, { maxRequests: 5, windowMs: 15 * 60 * 1000 })) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();

    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { username, password } = validation.data;

    const db = await getDatabase();
    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM users WHERE username = ?",
        [username],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const deviceInfo = getDeviceInfo(request);
    const sessionToken = await createSession(user.id, deviceInfo);

    const groups = await new Promise((resolve, reject) => {
      db.all(
        `SELECT ug.group_id, g.name
         FROM user_groups ug
         JOIN groups g ON ug.group_id = g.id
         WHERE ug.user_id = ?
         ORDER BY ug.joined_at ASC`,
        [user.id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    const current_group_id = groups.length > 0 ? groups[0].group_id : null;

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin || false,
        groups,
        current_group_id,
      },
      message: "Login successful",
    });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      sessionToken,
      getSessionCookieOptions()
    );

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

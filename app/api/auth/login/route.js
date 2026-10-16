import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDatabase } from "../../../../lib/database.js";
import { loginSchema } from "../../../../lib/validations.ts";
import { rateLimit, getClientIp } from "../../../../lib/rate-limit.ts";
import {
  createSession,
  SESSION_COOKIE_NAME,
  getDeviceInfo,
  createSecureSessionCookie,
  verifyRequestOrigin,
} from "../../../../lib/session.js";

export async function POST(request) {
  try {
    if (!verifyRequestOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    const clientIp = getClientIp(request);
    const body = await request.json();

    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const identifier = (validation.data.identifier || validation.data.username).trim();
    const password = validation.data.password;
    if (!rateLimit(`login:${clientIp}:${identifier.toLowerCase()}`, { maxRequests: 5, windowMs: 15 * 60 * 1000 })) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    const db = getDatabase();
    const accountCollisions = db.prepare(`
      SELECT COUNT(*) AS count FROM users
      WHERE (username = ? COLLATE NOCASE AND (pending_email IS NULL OR email_verified_at IS NOT NULL))
         OR (email = ? COLLATE NOCASE AND email_verified_at IS NOT NULL)
    `).get(identifier, identifier);
    if (accountCollisions?.count > 1) {
      return NextResponse.json({ error: "This sign-in name is ambiguous. Use your exact username." }, { status: 409 });
    }
    const user = db.prepare(
      `SELECT * FROM users
       WHERE ((username = ? COLLATE NOCASE AND (pending_email IS NULL OR email_verified_at IS NOT NULL))
          OR (email = ? COLLATE NOCASE AND email_verified_at IS NOT NULL))
       ORDER BY CASE WHEN email = ? COLLATE NOCASE AND email_verified_at IS NOT NULL THEN 0 ELSE 1 END
       LIMIT 1`
    ).get(identifier, identifier, identifier);

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
    const sessionToken = createSession(user.id, deviceInfo);

    const groups = db.prepare(
      `SELECT ug.group_id, g.name
       FROM user_groups ug
       JOIN groups g ON ug.group_id = g.id
       WHERE ug.user_id = ?
       ORDER BY ug.joined_at ASC`
    ).all(user.id) ?? [];
    const current_group_id = groups.length > 0 ? groups[0].group_id : null;

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin || false,
        language: user.language || "en",
        currency: user.currency || "EUR",
        minimum_balance_alert: user.minimum_balance_alert,
        tour_completed: Boolean(user.tour_completed),
        admin_tour_completed: Boolean(user.admin_tour_completed),
        groups,
        current_group_id,
      },
      message: "Login successful",
    });

    createSecureSessionCookie(request, response, sessionToken);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

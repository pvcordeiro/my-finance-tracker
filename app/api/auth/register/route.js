import { NextResponse } from "next/server";
import { getDatabase, hashPassword } from "../../../../lib/database.js";
import { registerSchema } from "../../../../lib/validations.ts";
import { rateLimit, getClientIp } from "../../../../lib/rate-limit.ts";
import {
  createSession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "../../../../lib/session.js";

export async function POST(request) {
  try {
    // Check if registration is allowed
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

    // Rate limiting
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

    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { username, password } = validation.data;

    // Check if user already exists
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

    // Hash password
    const hashedPassword = hashPassword(password);

    // Create user
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

    // Create session
    const sessionToken = await createSession(userId);

    // Create response with session cookie
    const response = NextResponse.json({
      user: { id: userId, username },
      message: "User created successfully",
    });

    // Set secure HTTP-only cookie
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

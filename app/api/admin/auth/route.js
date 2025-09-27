import { NextResponse } from "next/server";
import { adminLoginSchema } from "../../../../lib/validations.ts";
import {
  createAdminSession,
  getAdminSessionCookieOptions,
  ADMIN_SESSION_COOKIE_NAME,
} from "../../../../lib/admin-session.js";
import { getDatabase, verifyPassword } from "../../../../lib/database.js";

export async function POST(request) {
  try {
    const body = await request.json();

    const validation = adminLoginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { username, password } = validation.data;

    const db = await getDatabase();

    try {
      const user = await new Promise((resolve, reject) => {
        db.get(
          "SELECT id, username, password_hash, is_admin FROM users WHERE username = ? AND is_admin = 1",
          [username],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (user && verifyPassword(password, user.password_hash)) {
        const sessionToken = await createAdminSession();
        const response = NextResponse.json({
          success: true,
          message: "Admin login successful",
          admin: { isAdmin: true, userId: user.id },
        });
        response.cookies.set(
          ADMIN_SESSION_COOKIE_NAME,
          sessionToken,
          getAdminSessionCookieOptions()
        );
        return response;
      }
    } catch (error) {
      console.error("Error checking user admin status:", error);
    }

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      return NextResponse.json(
        { error: "Admin credentials not configured" },
        { status: 500 }
      );
    }

    if (username === adminUsername && password === adminPassword) {
      const sessionToken = await createAdminSession();
      const response = NextResponse.json({
        success: true,
        message: "Admin login successful",
        admin: { isAdmin: true },
      });
      response.cookies.set(
        ADMIN_SESSION_COOKIE_NAME,
        sessionToken,
        getAdminSessionCookieOptions()
      );
      return response;
    } else {
      return NextResponse.json(
        { error: "Invalid admin credentials" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Admin auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

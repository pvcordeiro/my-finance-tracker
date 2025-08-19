import { NextResponse } from "next/server";
import { adminLoginSchema } from "../../../../lib/validations.ts";
import {
  createAdminSession,
  getAdminSessionCookieOptions,
  ADMIN_SESSION_COOKIE_NAME,
} from "../../../../lib/admin-session.js";

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

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      return NextResponse.json(
        { error: "Admin credentials not configured" },
        { status: 500 }
      );
    }

    if (username === adminUsername && password === adminPassword) {
      const sessionToken = createAdminSession();
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

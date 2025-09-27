import { NextResponse } from "next/server";
import {
  deleteSession,
  getSessionFromRequest,
  SESSION_COOKIE_NAME,
} from "../../../../lib/session.js";

export async function POST(request) {
  try {
    const sessionToken = getSessionFromRequest(request);

    if (sessionToken) {
      await deleteSession(sessionToken);
    }

    const response = NextResponse.json({
      message: "Logout successful",
    });

    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

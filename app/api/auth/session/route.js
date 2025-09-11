import { NextResponse } from "next/server";
import {
  validateSession,
  getSessionFromRequest,
} from "../../../../lib/session.js";

export async function GET(request) {
  try {
    // Get session token from cookie
    const sessionToken = getSessionFromRequest(request);

    if (!sessionToken) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    // Validate session and get user data
    const user = await validateSession(sessionToken);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: { id: user.id, username: user.username },
    });
  } catch (error) {
    console.error("Session validation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

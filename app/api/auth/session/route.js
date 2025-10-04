import { NextResponse } from "next/server";
import {
  validateSession,
  getSessionFromRequest,
} from "../../../../lib/session.js";

export async function GET(request) {
  try {
    const sessionToken = getSessionFromRequest(request);

    if (!sessionToken) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    const user = await validateSession(sessionToken);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin,
        accent_color: user.accent_color || "blue",
        theme_preference: user.theme_preference || "system",
        groups: user.groups,
        current_group_id: user.current_group_id,
      },
    });
  } catch (error) {
    console.error("Session validation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

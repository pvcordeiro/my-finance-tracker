import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { validateSession, getSessionFromRequest } from "@/lib/session";

const ALLOWED_THEMES = ["light", "dark", "system"];

export async function GET(request) {
  try {
    const sessionToken = getSessionFromRequest(request);
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = validateSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDatabase();
    const row = db.prepare(
      `SELECT theme_preference FROM users WHERE id = ?`
    ).get(session.id);

    return NextResponse.json({
      theme: row?.theme_preference || "system",
    });
  } catch (error) {
    console.error("Error fetching theme preference:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const sessionToken = getSessionFromRequest(request);
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = validateSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { theme } = body;

    if (!theme || !ALLOWED_THEMES.includes(theme)) {
      return NextResponse.json(
        { error: "Invalid theme. Must be 'light', 'dark', or 'system'" },
        { status: 400 }
      );
    }

    const db = getDatabase();
    db.prepare(
      `UPDATE users SET theme_preference = ? WHERE id = ?`
    ).run(theme, session.id);

    return NextResponse.json({ success: true, theme });
  } catch (error) {
    console.error("Error updating theme preference:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

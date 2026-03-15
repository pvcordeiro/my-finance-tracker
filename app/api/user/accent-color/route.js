import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { validateSession, getSessionFromRequest } from "@/lib/session";

const ALLOWED_ACCENT_COLORS = [
  "blue",
  "purple",
  "yellow",
  "orange",
  "pink",
  "magenta",
  "cyan",
  "indigo",
  "amber",
];

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
      `SELECT accent_color FROM users WHERE id = ?`
    ).get(session.id);

    return NextResponse.json({
      accentColor: row?.accent_color || "blue",
    });
  } catch (error) {
    console.error("Error fetching accent color:", error);
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

    const { accentColor } = await request.json();

    if (!accentColor || !ALLOWED_ACCENT_COLORS.includes(accentColor)) {
      return NextResponse.json(
        { error: "Invalid accent color" },
        { status: 400 }
      );
    }

    const db = getDatabase();
    db.prepare(
      `UPDATE users SET accent_color = ? WHERE id = ?`
    ).run(accentColor, session.id);

    return NextResponse.json({ success: true, accentColor });
  } catch (error) {
    console.error("Error updating accent color:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

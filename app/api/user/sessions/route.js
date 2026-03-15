import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { validateSession, getSessionFromRequest } from "@/lib/session";

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
    const rows = db.prepare(`
      SELECT 
        id,
        token,
        user_agent,
        ip_address,
        device_name,
        created_at,
        last_accessed,
        expires_at
      FROM sessions 
      WHERE user_id = ? AND expires_at > datetime('now')
      ORDER BY last_accessed DESC
    `).all(session.id) ?? [];

    const sessions = rows.map(({ token: _token, ...row }) => ({
      ...row,
      is_current: _token === sessionToken,
    }));

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

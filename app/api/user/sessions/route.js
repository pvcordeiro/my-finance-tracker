import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { validateSession, getSessionFromRequest } from "@/lib/session";

export async function GET(request) {
  try {
    const sessionToken = getSessionFromRequest(request);
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await validateSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDatabase();

    return new Promise((resolve) => {
      db.all(
        `SELECT 
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
        ORDER BY last_accessed DESC`,
        [session.id],
        (err, rows) => {
          if (err) {
            console.error("Database error:", err);
            resolve(
              NextResponse.json(
                { error: "Failed to fetch sessions" },
                { status: 500 }
              )
            );
            return;
          }

          const sessions = rows.map((row) => ({
            ...row,
            is_current: row.token === sessionToken,
          }));

          resolve(
            NextResponse.json({
              sessions,
            })
          );
        }
      );
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

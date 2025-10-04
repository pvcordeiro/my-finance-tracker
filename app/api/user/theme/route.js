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

    const session = await validateSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDatabase();

    return new Promise((resolve) => {
      db.get(
        `SELECT theme_preference FROM users WHERE id = ?`,
        [session.id],
        (err, row) => {
          if (err) {
            console.error("Database error:", err);
            resolve(
              NextResponse.json(
                { error: "Failed to fetch theme preference" },
                { status: 500 }
              )
            );
            return;
          }

          resolve(
            NextResponse.json({
              theme: row?.theme_preference || "system",
            })
          );
        }
      );
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

    const session = await validateSession(sessionToken);
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

    const db = await getDatabase();

    return new Promise((resolve) => {
      db.run(
        `UPDATE users SET theme_preference = ? WHERE id = ?`,
        [theme, session.id],
        function (err) {
          if (err) {
            console.error("Database error:", err);
            resolve(
              NextResponse.json(
                { error: "Failed to update theme preference" },
                { status: 500 }
              )
            );
            return;
          }

          resolve(
            NextResponse.json({
              success: true,
              theme,
            })
          );
        }
      );
    });
  } catch (error) {
    console.error("Error updating theme preference:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

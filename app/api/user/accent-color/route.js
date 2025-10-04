import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { validateSession, getSessionFromRequest } from "@/lib/session";

const ALLOWED_ACCENT_COLORS = [
  "blue",
  "purple",
  "yellow",
  "orange",
  "pink",
  "red",
  "teal",
  "indigo",
  "amber",
];

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
        `SELECT accent_color FROM users WHERE id = ?`,
        [session.id],
        (err, row) => {
          if (err) {
            console.error("Database error:", err);
            resolve(
              NextResponse.json(
                { error: "Failed to fetch accent color" },
                { status: 500 }
              )
            );
            return;
          }

          resolve(
            NextResponse.json({
              accentColor: row?.accent_color || "blue",
            })
          );
        }
      );
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

    const session = await validateSession(sessionToken);
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

    const db = await getDatabase();

    return new Promise((resolve) => {
      db.run(
        `UPDATE users SET accent_color = ? WHERE id = ?`,
        [accentColor, session.id],
        function (err) {
          if (err) {
            console.error("Database error:", err);
            resolve(
              NextResponse.json(
                { error: "Failed to update accent color" },
                { status: 500 }
              )
            );
            return;
          }

          resolve(
            NextResponse.json({
              success: true,
              accentColor,
            })
          );
        }
      );
    });
  } catch (error) {
    console.error("Error updating accent color:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

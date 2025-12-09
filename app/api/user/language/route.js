import { NextResponse } from "next/server";
import { getDatabase } from "../../../../lib/database.js";
import {
  getSessionFromRequest,
  validateSession,
} from "../../../../lib/session.js";

export async function POST(request) {
  try {
    const sessionToken = getSessionFromRequest(request);
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await validateSession(sessionToken);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { language } = await request.json();
    if (!language || !["en", "pt"].includes(language)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }

    const db = await getDatabase();
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET language = ? WHERE id = ?",
        [language, user.id],
        (err) => {
          if (err) reject(err);
          else resolve(null);
        }
      );
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating language:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

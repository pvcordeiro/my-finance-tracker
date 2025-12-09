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

    const { currency } = await request.json();
    if (!currency || !["EUR", "USD", "BRL"].includes(currency)) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }

    const db = await getDatabase();
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET currency = ? WHERE id = ?",
        [currency, user.id],
        (err) => {
          if (err) reject(err);
          else resolve(null);
        }
      );
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating currency:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

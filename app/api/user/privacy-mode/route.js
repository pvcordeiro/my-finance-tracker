import { NextResponse } from "next/server";
import { getDatabase } from "../../../../lib/database.js";
import {
  validateSession,
  getSessionFromRequest,
} from "../../../../lib/session.js";

export async function GET(request) {
  try {
    const sessionToken = getSessionFromRequest(request);
    const userSession = await validateSession(sessionToken);

    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDatabase();
    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT privacy_mode FROM users WHERE id = ?",
        [userSession.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    const privacyModeValue =
      user?.privacy_mode === 1 || user?.privacy_mode === true;

    return NextResponse.json({
      privacyMode: privacyModeValue,
    });
  } catch (error) {
    console.error("Get privacy mode error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const sessionToken = getSessionFromRequest(request);
    const userSession = await validateSession(sessionToken);

    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { privacyMode } = body;

    if (typeof privacyMode !== "boolean") {
      return NextResponse.json(
        { error: "Invalid privacy mode value" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET privacy_mode = ? WHERE id = ?",
        [privacyMode ? 1 : 0, userSession.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    return NextResponse.json({
      success: true,
      privacyMode,
    });
  } catch (error) {
    console.error("Update privacy mode error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

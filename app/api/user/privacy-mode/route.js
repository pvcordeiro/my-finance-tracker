import { NextResponse } from "next/server";
import { getDatabase } from "../../../../lib/database.js";
import {
  validateSession,
  getSessionFromRequest,
} from "../../../../lib/session.js";

export async function GET(request) {
  try {
    const sessionToken = getSessionFromRequest(request);
    const userSession = validateSession(sessionToken);

    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDatabase();
    const user = db.prepare(
      "SELECT privacy_mode FROM users WHERE id = ?"
    ).get(userSession.id);

    const privacyModeValue =
      user?.privacy_mode === 1 || user?.privacy_mode === true;

    return NextResponse.json({ privacyMode: privacyModeValue });
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
    const userSession = validateSession(sessionToken);

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

    const db = getDatabase();
    db.prepare(
      "UPDATE users SET privacy_mode = ? WHERE id = ?"
    ).run(privacyMode ? 1 : 0, userSession.id);

    return NextResponse.json({ success: true, privacyMode });
  } catch (error) {
    console.error("Update privacy mode error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

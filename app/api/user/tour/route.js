import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import {
  getSessionFromRequest,
  validateSession,
  verifyRequestOrigin,
} from "@/lib/session";

export async function POST(request) {
  try {
    if (!verifyRequestOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const session = validateSession(getSessionFromRequest(request));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    getDatabase()
      .prepare("UPDATE users SET tour_completed = TRUE WHERE id = ?")
      .run(session.id);

    return NextResponse.json({ success: true, tour_completed: true });
  } catch (error) {
    console.error("Save guided tour completion failed:", error);
    return NextResponse.json(
      { error: "Unable to save guided tour completion." },
      { status: 500 }
    );
  }
}

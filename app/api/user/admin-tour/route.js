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
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!session.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    getDatabase()
      .prepare("UPDATE users SET admin_tour_completed = TRUE WHERE id = ? AND is_admin = TRUE")
      .run(session.id);
    return NextResponse.json({ success: true, admin_tour_completed: true });
  } catch (error) {
    console.error("Save admin tour completion failed:", error);
    return NextResponse.json({ error: "Unable to save admin tour completion." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import {
  validateAdminSession,
  getAdminSessionFromRequest,
} from "../../../../lib/admin-session.js";

export async function GET(request) {
  try {
    const sessionToken = getAdminSessionFromRequest(request);
    const adminSession = validateAdminSession(sessionToken);

    if (adminSession) {
      return NextResponse.json({
        admin: { isAdmin: true },
      });
    } else {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
  } catch (error) {
    console.error("Admin session check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

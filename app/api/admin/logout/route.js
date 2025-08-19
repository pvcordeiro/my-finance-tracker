import { NextResponse } from "next/server";
import {
  deleteAdminSession,
  getAdminSessionFromRequest,
  ADMIN_SESSION_COOKIE_NAME,
} from "../../../../lib/admin-session.js";

export async function POST(request) {
  try {
    const sessionToken = getAdminSessionFromRequest(request);
    if (sessionToken) {
      deleteAdminSession(sessionToken);
    }
    const response = NextResponse.json({ success: true });
    response.cookies.delete(ADMIN_SESSION_COOKIE_NAME);
    return response;
  } catch (error) {
    console.error("Admin logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

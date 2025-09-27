import { NextResponse } from "next/server";
import { switchGroup, getSessionFromRequest } from "../../../lib/session.js";
import {
  withAuth,
  getAuthenticatedUser,
} from "../../../lib/auth-middleware.js";

export const POST = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    const sessionToken = getSessionFromRequest(request);

    const body = await request.json();
    const { groupId } = body;

    if (!groupId) {
      return NextResponse.json(
        { error: "groupId is required" },
        { status: 400 }
      );
    }

    const hasAccess = user.groups.some((group) => group.group_id === groupId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to this group" },
        { status: 403 }
      );
    }

    await switchGroup(sessionToken, groupId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Switch group error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

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

    const rawBody = await request.text();
    if (rawBody.length > 10_000) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { groupId } = body;

    if (!groupId) {
      return NextResponse.json(
        { error: "groupId is required" },
        { status: 400 }
      );
    }

    const numericGroupId = Number(groupId);
    if (!Number.isInteger(numericGroupId) || numericGroupId <= 0) {
      return NextResponse.json({ error: "Invalid groupId" }, { status: 400 });
    }
    const hasAccess = user.groups.some(
      (group) => group.group_id === numericGroupId
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to this group" },
        { status: 403 }
      );
    }

    await switchGroup(sessionToken, numericGroupId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Switch group error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

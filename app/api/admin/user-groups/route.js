import { NextResponse } from "next/server";
import { getDatabase } from "../../../../lib/database.js";
import {
  validateSession,
  getSessionFromRequest,
} from "../../../../lib/session.js";

function verifyAdmin(request) {
  const sessionToken = getSessionFromRequest(request);
  const userSession = validateSession(sessionToken);
  return userSession && userSession.is_admin == true;
}

export async function GET(request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDatabase();
    const userGroups = db.prepare(`
      SELECT
        ug.id,
        ug.user_id,
        ug.group_id,
        ug.joined_at,
        u.username,
        g.name as group_name
      FROM user_groups ug
      JOIN users u ON ug.user_id = u.id
      JOIN groups g ON ug.group_id = g.id
      ORDER BY ug.joined_at DESC
    `).all() ?? [];

    return NextResponse.json({ userGroups });
  } catch (error) {
    console.error("Get user groups error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.text();
    if (rawBody.length > 20_000) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { userId, groupId } = body;
    const numericUserId = Number(userId);
    const numericGroupId = Number(groupId);
    if (
      !Number.isInteger(numericUserId) ||
      numericUserId <= 0 ||
      !Number.isInteger(numericGroupId) ||
      numericGroupId <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid identifiers" },
        { status: 400 }
      );
    }

    if (!userId || !groupId) {
      return NextResponse.json(
        { error: "userId and groupId are required" },
        { status: 400 }
      );
    }

    const db = getDatabase();

    const user = db.prepare(
      "SELECT id FROM users WHERE id = ?"
    ).get(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const group = db.prepare(
      "SELECT id FROM groups WHERE id = ?"
    ).get(groupId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const existing = db.prepare(
      "SELECT id FROM user_groups WHERE user_id = ? AND group_id = ?"
    ).get(numericUserId, numericGroupId);

    if (existing) {
      return NextResponse.json(
        { error: "User is already in this group" },
        { status: 409 }
      );
    }

    db.prepare(
      `INSERT INTO user_groups (user_id, group_id, joined_at) VALUES (?, ?, CURRENT_TIMESTAMP)`
    ).run(numericUserId, numericGroupId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Assign user to group error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const groupId = searchParams.get("groupId");

    if (!userId || !groupId) {
      return NextResponse.json(
        { error: "userId and groupId are required" },
        { status: 400 }
      );
    }

    const db = getDatabase();

    const result = db.prepare(
      "DELETE FROM user_groups WHERE user_id = ? AND group_id = ?"
    ).run(userId, groupId);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "User is not in this group" },
        { status: 404 }
      );
    }

    db.prepare(
      "UPDATE users SET last_selected_group_id = NULL WHERE id = ? AND last_selected_group_id = ?"
    ).run(userId, groupId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove user from group error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

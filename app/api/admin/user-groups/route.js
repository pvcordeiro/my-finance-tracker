import { NextResponse } from "next/server";
import { getDatabase } from "../../../../lib/database.js";
import {
  validateSession,
  getSessionFromRequest,
} from "../../../../lib/session.js";

async function verifyAdmin(request) {
  const sessionToken = getSessionFromRequest(request);
  const userSession = await validateSession(sessionToken);
  return userSession && userSession.is_admin == true;
}

export async function GET(request) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDatabase();
    const userGroups = await new Promise((resolve, reject) => {
      db.all(
        `
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
        `,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

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
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, groupId } = body;

    if (!userId || !groupId) {
      return NextResponse.json(
        { error: "userId and groupId are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Check if user exists
    const user = await new Promise((resolve, reject) => {
      db.get("SELECT id FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if group exists
    const group = await new Promise((resolve, reject) => {
      db.get("SELECT id FROM groups WHERE id = ?", [groupId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check if already assigned
    const existing = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM user_groups WHERE user_id = ? AND group_id = ?",
        [userId, groupId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existing) {
      return NextResponse.json(
        { error: "User is already in this group" },
        { status: 409 }
      );
    }

    // Add to group (allow multiple groups per user)
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO user_groups (user_id, group_id, joined_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [userId, groupId],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
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
    if (!(await verifyAdmin(request))) {
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

    const db = await getDatabase();

    const result = await new Promise((resolve, reject) => {
      db.run(
        "DELETE FROM user_groups WHERE user_id = ? AND group_id = ?",
        [userId, groupId],
        function (err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "User is not in this group" },
        { status: 404 }
      );
    }

    // If the user was removed from their last selected group, clear the preference
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET last_selected_group_id = NULL WHERE id = ? AND last_selected_group_id = ?",
        [userId, groupId],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove user from group error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

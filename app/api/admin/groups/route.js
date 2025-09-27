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
    const groups = await new Promise((resolve, reject) => {
      db.all(
        `
          SELECT
            g.id,
            g.name,
            g.created_at,
            u.username as created_by_username,
            u.is_admin as created_by_admin,
            COUNT(ug.user_id) as member_count
          FROM groups g
          LEFT JOIN users u ON g.created_by = u.id
          LEFT JOIN user_groups ug ON g.id = ug.group_id
          GROUP BY g.id, g.name, g.created_at, u.username, u.is_admin
          ORDER BY g.created_at DESC
        `,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Get groups error:", error);
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

    const sessionToken = getSessionFromRequest(request);
    const adminUser = await validateSession(sessionToken);

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    const groupId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO groups (name, created_by, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [name.trim(), adminUser.id],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    return NextResponse.json({
      success: true,
      group: {
        id: groupId,
        name: name.trim(),
        created_by: adminUser.id,
        member_count: 0,
      },
    });
  } catch (error) {
    console.error("Create group error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json(
        { error: "groupId is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Check if group exists
    const group = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, name FROM groups WHERE id = ?",
        [groupId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Update the group name
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE groups SET name = ? WHERE id = ?",
        [name.trim(), groupId],
        function (err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });

    return NextResponse.json({
      success: true,
      message: "Group renamed successfully",
      group: {
        id: parseInt(groupId),
        name: name.trim(),
      },
    });
  } catch (error) {
    console.error("Rename group error:", error);
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
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json(
        { error: "groupId is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Check if group exists and is not the first group
    const group = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, name FROM groups WHERE id = ?",
        [groupId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.id === 1) {
      return NextResponse.json(
        { error: "Cannot delete the first group" },
        { status: 403 }
      );
    }

    // Clear last_selected_group_id for any users who had this group selected
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET last_selected_group_id = NULL WHERE last_selected_group_id = ?",
        [groupId],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Delete the group (cascade will handle related data)
    await new Promise((resolve, reject) => {
      db.run("DELETE FROM groups WHERE id = ?", [groupId], function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });

    return NextResponse.json({
      success: true,
      message: "Group deleted successfully",
    });
  } catch (error) {
    console.error("Delete group error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

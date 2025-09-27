import { NextResponse } from "next/server";
import { getDatabase } from "../../../../lib/database.js";
import { deleteUserSchema } from "../../../../lib/validations.ts";
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
    const userRows = await new Promise((resolve, reject) => {
      db.all(
        `
          SELECT 
            u.id, 
            u.username, 
            u.is_admin,
            u.created_at,
            g.name as group_name,
            g.id as group_id
          FROM users u 
          LEFT JOIN user_groups ug ON u.id = ug.user_id
          LEFT JOIN groups g ON ug.group_id = g.id
          ORDER BY u.created_at DESC, ug.joined_at ASC
        `,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Group users by id and collect their groups
    const usersMap = new Map();
    userRows.forEach((row) => {
      if (!usersMap.has(row.id)) {
        usersMap.set(row.id, {
          id: row.id,
          username: row.username,
          is_admin: row.is_admin,
          created_at: row.created_at,
          groups: [],
        });
      }

      const user = usersMap.get(row.id);
      if (row.group_id) {
        user.groups.push({
          id: row.group_id,
          name: row.group_name,
        });
      }
    });

    const users = Array.from(usersMap.values());

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
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

    const validation = deleteUserSchema.safeParse({ userId });
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    if (validation.data.userId === 1) {
      return NextResponse.json(
        { error: "Cannot delete the primary admin user" },
        { status: 403 }
      );
    }

    const db = await getDatabase();

    const result = await new Promise((resolve, reject) => {
      db.run(
        "DELETE FROM users WHERE id = ?",
        [validation.data.userId],
        function (err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });

    if (result.changes === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
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
    const userId = searchParams.get("userId");

    const validation = deleteUserSchema.safeParse({ userId });
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    if (validation.data.userId === 1) {
      return NextResponse.json(
        { error: "Cannot modify the primary admin user" },
        { status: 403 }
      );
    }

    const db = await getDatabase();

    const currentUser = await new Promise((resolve, reject) => {
      db.get(
        "SELECT is_admin FROM users WHERE id = ?",
        [validation.data.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newAdminStatus = currentUser.is_admin == true ? 0 : 1;

    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET is_admin = ? WHERE id = ?",
        [newAdminStatus, validation.data.userId],
        function (err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });

    return NextResponse.json({
      success: true,
      message: `User admin status ${newAdminStatus ? "granted" : "revoked"}`,
      is_admin: newAdminStatus == 1,
    });
  } catch (error) {
    console.error("Toggle admin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

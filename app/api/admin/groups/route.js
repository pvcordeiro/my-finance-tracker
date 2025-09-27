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
            COUNT(ug.user_id) as member_count
          FROM groups g
          LEFT JOIN users u ON g.created_by = u.id
          LEFT JOIN user_groups ug ON g.id = ug.group_id
          GROUP BY g.id, g.name, g.created_at, u.username
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

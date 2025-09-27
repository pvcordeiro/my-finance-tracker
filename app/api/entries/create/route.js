import { NextResponse } from "next/server";
import { getDatabase } from "../../../../lib/database.js";
import {
  withAuth,
  getAuthenticatedUser,
} from "../../../../lib/auth-middleware.js";

export const POST = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    const groupId = user.current_group_id;
    if (!groupId) {
      return NextResponse.json(
        { error: "No active group selected", code: "no_group" },
        { status: 403 }
      );
    }
    const body = await request.json();
    const { name = "", type } = body || {};
    if (!type || !["income", "expense"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid or missing type" },
        { status: 400 }
      );
    }
    const db = await getDatabase();
    const entryId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO entries (group_id, user_id, name, type, created_at, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [groupId, user.id, name, type],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
    return NextResponse.json({ success: true, id: entryId });
  } catch (e) {
    console.error("Create entry error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

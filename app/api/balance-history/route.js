import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/database.js";
import {
  withAuth,
  getAuthenticatedUser,
} from "../../../lib/auth-middleware.js";

export const GET = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    const groupId = user.current_group_id;

    if (!groupId) {
      return NextResponse.json({ history: [], enabled: false });
    }

    const db = await getDatabase();

    const settingRow = await new Promise((resolve, reject) => {
      db.get(
        "SELECT value FROM settings WHERE key = 'enable_balance_history'",
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    const displayEnabled = settingRow?.value === "true";

    const history = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          bh.id,
          bh.old_amount,
          bh.new_amount,
          bh.delta,
          bh.note,
          bh.created_at,
          u.username
        FROM balance_history bh
        LEFT JOIN users u ON bh.user_id = u.id
        WHERE bh.group_id = ?
        ORDER BY bh.created_at DESC
        LIMIT 50`,
        [groupId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    return NextResponse.json({ history, enabled: displayEnabled });
  } catch (error) {
    console.error("Get balance history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

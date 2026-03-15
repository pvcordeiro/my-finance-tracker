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

    const db = getDatabase();

    const settingRow = db.prepare(
      "SELECT value FROM settings WHERE key = 'enable_balance_history'"
    ).get();

    const displayEnabled = settingRow?.value === "true";

    const history = db.prepare(`
      SELECT 
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
      LIMIT 50
    `).all(groupId) ?? [];

    return NextResponse.json({ history, enabled: displayEnabled });
  } catch (error) {
    console.error("Get balance history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

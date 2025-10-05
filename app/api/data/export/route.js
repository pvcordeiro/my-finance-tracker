import { NextResponse } from "next/server";
import { getDatabase } from "../../../../lib/database.js";
import {
  withAuth,
  getAuthenticatedUser,
} from "../../../../lib/auth-middleware.js";

export const GET = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    const groupId = user.current_group_id;

    if (!groupId) {
      return NextResponse.json(
        { error: "No active group selected", code: "no_group" },
        { status: 403 }
      );
    }

    const db = await getDatabase();

    const bankAmount = await new Promise((resolve, reject) => {
      db.get(
        "SELECT amount FROM bank_amounts WHERE group_id = ? ORDER BY updated_at DESC LIMIT 1",
        [groupId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    const currentYear = new Date().getFullYear();

    const entriesWithAmounts = await new Promise((resolve, reject) => {
      db.all(
        `
        SELECT 
          e.id, e.name, e.type, e.created_at, e.updated_at,
          ea.month, ea.amount
        FROM entries e
        LEFT JOIN entry_amounts ea ON e.id = ea.entry_id AND ea.year = ?
        WHERE e.group_id = ?
        ORDER BY e.created_at DESC, ea.month ASC
      `,
        [currentYear, groupId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    const entriesMap = new Map();

    entriesWithAmounts.forEach((row) => {
      if (!entriesMap.has(row.id)) {
        entriesMap.set(row.id, {
          id: row.id,
          name: row.name,
          type: row.type,
          created_at: row.created_at,
          updated_at: row.updated_at,
          amounts: new Array(12).fill(0),
        });
      }

      const entry = entriesMap.get(row.id);
      if (row.month && row.amount !== null) {
        entry.amounts[row.month - 1] = parseFloat(row.amount);
      }
    });

    const parsedEntries = Array.from(entriesMap.values());

    const exportData = {
      bankAmount: bankAmount?.amount || 0,
      entries: parsedEntries,
      exportDate: new Date().toISOString(),
      groupId: groupId,
      exportedBy: user.username,
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Export data error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

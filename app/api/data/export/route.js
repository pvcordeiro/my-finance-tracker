import { NextResponse } from "next/server";
import { getDatabase } from "../../../../lib/database.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || 1;

    const db = await getDatabase();

    // Get bank amount
    const bankAmount = await new Promise((resolve, reject) => {
      db.get(
        "SELECT amount FROM bank_amounts WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1",
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    // Get entries
    const entries = await new Promise((resolve, reject) => {
      db.all(
        "SELECT * FROM entries WHERE user_id = ? ORDER BY created_at DESC",
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    const parsedEntries = entries.map((entry) => ({
      ...entry,
      amounts: JSON.parse(entry.amounts),
    }));

    const exportData = {
      bankAmount: bankAmount?.amount || 0,
      entries: parsedEntries,
      exportDate: new Date().toISOString(),
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Export data error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

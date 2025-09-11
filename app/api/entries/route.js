import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/database.js";
import { entrySchema } from "../../../lib/validations.ts";
import {
  withAuth,
  getAuthenticatedUser,
} from "../../../lib/auth-middleware.js";

export const GET = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    const userId = user.id;

    const db = await getDatabase();
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

    // Parse amounts JSON for each entry
    const parsedEntries = entries.map((entry) => ({
      ...entry,
      amounts: JSON.parse(entry.amounts),
    }));

    return NextResponse.json({ entries: parsedEntries });
  } catch (error) {
    console.error("Get entries error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    const userId = user.id;

    const body = await request.json();
    const { entries } = body;

    if (!Array.isArray(entries)) {
      return NextResponse.json(
        { error: "Entries must be an array" },
        { status: 400 }
      );
    }

    // Validate each entry
    for (const entry of entries) {
      const validation = entrySchema.safeParse(entry);
      if (!validation.success) {
        return NextResponse.json(
          { error: "Invalid entry data", details: validation.error.errors },
          { status: 400 }
        );
      }
    }

    const db = await getDatabase();

    // Clear existing entries for user
    await new Promise((resolve, reject) => {
      db.run("DELETE FROM entries WHERE user_id = ?", [userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Insert new entries
    let insertedCount = 0;
    for (const entry of entries) {
      if (entry.name && entry.type && entry.amounts) {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO entries (user_id, name, type, amounts, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [userId, entry.name, entry.type, entry.amounts],
            function (err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        insertedCount++;
      }
    }

    return NextResponse.json({ success: true, count: insertedCount });
  } catch (error) {
    console.error("Save entries error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

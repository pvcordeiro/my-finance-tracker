import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/database.js";
import { entrySchema } from "../../../lib/validations.ts";
import {
  withAuth,
  getAuthenticatedUser,
} from "../../../lib/auth-middleware.js";
import { notifyEntryChange } from "../../../lib/sse-notifications.js";

export const GET = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    const groupId = user.current_group_id;

    if (!groupId) {
      return NextResponse.json({ entries: [], code: "no_group" });
    }

    const db = getDatabase();

    const entriesWithAmounts = db.prepare(`
      SELECT 
        e.id, e.name, e.type, e.created_at, e.updated_at,
        ea.month, ea.amount
      FROM entries e
      LEFT JOIN entry_amounts ea ON e.id = ea.entry_id
      WHERE e.group_id = ?
      ORDER BY e.created_at DESC, ea.month ASC
    `).all(groupId) ?? [];

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

    const entries = Array.from(entriesMap.values());

    const lastUpdatedInfo = db.prepare(
      "SELECT MAX(updated_at) as last_updated, user_id as last_updated_user_id FROM entries WHERE group_id = ?"
    ).get(groupId);

    return NextResponse.json({
      entries,
      last_updated: lastUpdatedInfo?.last_updated || null,
      last_updated_user_id: lastUpdatedInfo?.last_updated_user_id || null,
    });
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
    const groupId = user.current_group_id;

    if (!groupId) {
      return NextResponse.json(
        { error: "No active group selected", code: "no_group" },
        { status: 403 }
      );
    }

    const rawBody = await request.text();
    if (rawBody.length > 200_000) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { entries } = body;

    if (!Array.isArray(entries)) {
      return NextResponse.json(
        { error: "Entries must be an array" },
        { status: 400 }
      );
    }

    for (const entry of entries) {
      const validation = entrySchema.safeParse(entry);
      if (!validation.success) {
        return NextResponse.json(
          { error: "Invalid entry data", details: validation.error.errors },
          { status: 400 }
        );
      }
      if (Array.isArray(entry.amounts)) {
        for (const a of entry.amounts) {
          if (
            typeof a !== "number" ||
            !Number.isFinite(a) ||
            a < -1_000_000_000 ||
            a > 1_000_000_000
          ) {
            return NextResponse.json(
              { error: "Invalid amount value" },
              { status: 400 }
            );
          }
        }
      }
    }

    const db = getDatabase();

    const doTransaction = db.transaction(() => {
      db.prepare(
        `DELETE FROM entry_amounts WHERE entry_id IN (SELECT id FROM entries WHERE group_id = ?)`
      ).run(groupId);

      db.prepare("DELETE FROM entries WHERE group_id = ?").run(groupId);

      let insertedCount = 0;
      for (const entry of entries) {
        if (entry.name && entry.type && entry.amounts) {
          const entryResult = db.prepare(
            `INSERT INTO entries (group_id, user_id, name, type, created_at, updated_at) 
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
          ).run(groupId, user.id, entry.name, entry.type);
          const entryId = entryResult.lastInsertRowid;

          let amounts = entry.amounts;
          if (typeof amounts === "string") {
            try {
              amounts = JSON.parse(amounts);
            } catch (error) {
              console.error("Failed to parse amounts JSON:", error);
              amounts = [];
            }
          }

          if (Array.isArray(amounts)) {
            for (let monthIndex = 0; monthIndex < amounts.length; monthIndex++) {
              const month = monthIndex + 1;
              const amount = parseFloat(amounts[monthIndex]) || 0;
              db.prepare(
                `INSERT OR REPLACE INTO entry_amounts (entry_id, month, amount, created_at, updated_at) 
                 VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
              ).run(entryId, month, amount);
            }
          }

          insertedCount++;
        }
      }

      return insertedCount;
    });

    const insertedCount = doTransaction();

    notifyEntryChange(groupId, "bulk-update", { timestamp: Date.now() });

    return NextResponse.json({ success: true, count: insertedCount });
  } catch (error) {
    console.error("Save entries error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    const groupId = user.current_group_id;

    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get("id");

    if (!entryId) {
      return NextResponse.json(
        { error: "Entry ID is required" },
        { status: 400 }
      );
    }

    const db = getDatabase();

    const entry = db.prepare(
      "SELECT id FROM entries WHERE id = ? AND group_id = ?"
    ).get(entryId, groupId);

    if (!entry) {
      return NextResponse.json(
        { error: "Entry not found or access denied" },
        { status: 404 }
      );
    }

    const result = db.prepare(
      "DELETE FROM entries WHERE id = ? AND group_id = ?"
    ).run(entryId, groupId);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    notifyEntryChange(groupId, "delete", { entryId, timestamp: Date.now() });

    return NextResponse.json({
      success: true,
      message: "Entry deleted successfully",
    });
  } catch (error) {
    console.error("Delete entry error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

export const PATCH = withAuth(async (request) => {
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
    const { id, name, month, amount, year } = body || {};
    if (!id) {
      return NextResponse.json(
        { error: "Entry id is required" },
        { status: 400 }
      );
    }
    const db = getDatabase();

    const entry = db.prepare(
      "SELECT id FROM entries WHERE id = ? AND group_id = ?"
    ).get(id, groupId);

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const updates = {};
    if (name !== undefined) {
      db.prepare(
        `UPDATE entries SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).run(name, id);
      updates.name = name;
    }

    if (month !== undefined && amount !== undefined) {
      const numericMonth = Number(month);
      const numericAmount = Number(amount) || 0;

      db.prepare(
        `INSERT OR REPLACE INTO entry_amounts (entry_id, month, amount, created_at, updated_at) 
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).run(id, numericMonth, numericAmount);

      updates.month = numericMonth;
      updates.amount = numericAmount;
    }

    notifyEntryChange(groupId, "update", {
      entryId: id,
      updates,
      timestamp: Date.now(),
    });

    return NextResponse.json({ success: true, updates });
  } catch (error) {
    console.error("Patch entry error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

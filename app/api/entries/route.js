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
    const groupId = user.current_group_id;

    if (!groupId) {
      return NextResponse.json({ entries: [], code: "no_group" });
    }

    const currentYear = new Date().getFullYear();

    const db = await getDatabase();

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

    const entries = Array.from(entriesMap.values());

    const lastUpdatedInfo = await new Promise((resolve, reject) => {
      db.get(
        "SELECT MAX(updated_at) as last_updated, user_id as last_updated_user_id FROM entries WHERE group_id = ?",
        [groupId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

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

    const currentYear = new Date().getFullYear();

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

    const db = await getDatabase();

    await new Promise((resolve, reject) => {
      db.run("BEGIN TRANSACTION", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    try {
      await new Promise((resolve, reject) => {
        db.run(
          `
          DELETE FROM entry_amounts 
          WHERE entry_id IN (SELECT id FROM entries WHERE group_id = ?)
        `,
          [groupId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      await new Promise((resolve, reject) => {
        db.run("DELETE FROM entries WHERE group_id = ?", [groupId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      let insertedCount = 0;
      for (const entry of entries) {
        if (entry.name && entry.type && entry.amounts) {
          const entryId = await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO entries (group_id, user_id, name, type, created_at, updated_at) 
               VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [groupId, user.id, entry.name, entry.type],
              function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
              }
            );
          });

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
            for (
              let monthIndex = 0;
              monthIndex < amounts.length;
              monthIndex++
            ) {
              const month = monthIndex + 1;
              const amount = parseFloat(amounts[monthIndex]) || 0;

              await new Promise((resolve, reject) => {
                db.run(
                  `INSERT INTO entry_amounts (entry_id, month, year, amount) 
                   VALUES (?, ?, ?, ?)`,
                  [entryId, month, currentYear, amount],
                  function (err) {
                    if (err) reject(err);
                    else resolve();
                  }
                );
              });
            }
          }

          insertedCount++;
        }
      }

      await new Promise((resolve, reject) => {
        db.run("COMMIT", (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return NextResponse.json({ success: true, count: insertedCount });
    } catch (error) {
      await new Promise((resolve) => {
        db.run("ROLLBACK", () => resolve());
      });
      throw error;
    }
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

    const db = await getDatabase();

    const entry = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM entries WHERE id = ? AND group_id = ?",
        [entryId, groupId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Entry not found or access denied" },
        { status: 404 }
      );
    }

    const result = await new Promise((resolve, reject) => {
      db.run(
        "DELETE FROM entries WHERE id = ? AND group_id = ?",
        [entryId, groupId],
        function (err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });

    if (result.changes === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

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
    const db = await getDatabase();

    const entry = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM entries WHERE id = ? AND group_id = ?",
        [id, groupId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const updates = {};
    if (name !== undefined) {
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE entries SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [name, id],
          function (err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      updates.name = name;
    }

    if (month !== undefined && amount !== undefined) {
      const numericMonth = Number(month);
      const numericAmount = Number(amount) || 0;
      const effectiveYear = year || new Date().getFullYear();

      const updateResult = await new Promise((resolve, reject) => {
        db.run(
          `UPDATE entry_amounts SET amount = ?, updated_at = CURRENT_TIMESTAMP WHERE entry_id = ? AND month = ? AND year = ?`,
          [numericAmount, id, numericMonth, effectiveYear],
          function (err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
          }
        );
      });
      if (updateResult.changes === 0) {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO entry_amounts (entry_id, month, year, amount) VALUES (?, ?, ?, ?)`,
            [id, numericMonth, effectiveYear, numericAmount],
            function (err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
      updates.month = numericMonth;
      updates.amount = numericAmount;
      updates.year = effectiveYear;
    }

    return NextResponse.json({ success: true, updates });
  } catch (error) {
    console.error("Patch entry error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

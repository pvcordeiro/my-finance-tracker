import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/database.js";
import { entrySchema } from "../../../lib/validations.ts";
import {
  withAuth,
  getAuthenticatedUser,
} from "../../../lib/auth-middleware.js";
import { notifyEntryChange } from "../../../lib/sse-notifications.js";
import { notifyBankAmountChange } from "../../../lib/sse-notifications.js";
import { applyOccurrenceToBalance, backfillLegacyRollingAmounts } from "../../../lib/rolling-months.js";

export const GET = withAuth(async (request) => {
  try {
    const user = getAuthenticatedUser(request);
    const groupId = user.current_group_id;

    if (!groupId) {
      return NextResponse.json({ entries: [], code: "no_group" });
    }

    const db = getDatabase();

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const nextMonths = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(currentYear, currentMonth - 1 + index, 1);
      return { year: date.getFullYear(), month: date.getMonth() + 1 };
    });

    const recurrentEntries = db.prepare(
      "SELECT id, recurrence_amount FROM entries WHERE group_id = ? AND recurrent = 1"
    ).all(groupId) ?? [];
    const ensureRecurringOccurrences = db.transaction(() => {
      for (const entry of recurrentEntries) {
        for (const slot of nextMonths) {
          const insertResult = db.prepare(`
            INSERT OR IGNORE INTO entry_occurrences
              (entry_id, year, month, amount, is_resolved)
            VALUES (?, ?, ?, ?, 0)
          `).run(entry.id, slot.year, slot.month, entry.recurrence_amount);
          if (insertResult.changes > 0) {
            db.prepare(`
              INSERT OR REPLACE INTO entry_amounts
                (entry_id, month, year, amount, created_at, updated_at)
              VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).run(entry.id, slot.month, slot.year, entry.recurrence_amount);
          } else {
            // Some historical recurring rows were zeroed while their future
            // schedule remained active. Seed new future occurrences from the
            // recurring template, but never refill a resolved/dismissed month.
            db.prepare(`
              UPDATE entry_occurrences
              SET amount = ?, updated_at = CURRENT_TIMESTAMP
              WHERE entry_id = ? AND year = ? AND month = ?
                AND is_resolved = 0 AND is_dismissed = 0 AND amount = 0
            `).run(entry.recurrence_amount, entry.id, slot.year, slot.month);
            db.prepare(`
              UPDATE entry_amounts
              SET amount = ?, updated_at = CURRENT_TIMESTAMP
              WHERE entry_id = ? AND year = ? AND month = ?
                AND EXISTS (SELECT 1 FROM entry_occurrences WHERE entry_id = ? AND year = ? AND month = ? AND is_resolved = 0 AND is_dismissed = 0)
            `).run(entry.recurrence_amount, entry.id, slot.year, slot.month, entry.id, slot.year, slot.month);
          }
        }
      }
    });
    ensureRecurringOccurrences();

    db.prepare(`
      INSERT OR IGNORE INTO entry_occurrences (entry_id, year, month, amount, is_resolved, is_dismissed)
      SELECT e.id, ea.year, ea.month, ea.amount, 1, 0
      FROM entries e JOIN entry_amounts ea ON ea.entry_id = e.id
      WHERE e.group_id = ?
    `).run(groupId);

    const entriesMap = new Map();
    const rowsWithSlots = db.prepare(`
      SELECT e.id, e.name, e.type, e.created_at, e.updated_at,
        e.recurrent, e.recurrence_amount,
        o.id AS occurrence_id, o.year, o.month, o.amount, o.is_resolved, o.is_dismissed,
        ea.amount AS legacy_amount
      FROM entries e
      LEFT JOIN entry_occurrences o ON e.id = o.entry_id
      LEFT JOIN entry_amounts ea ON e.id = ea.entry_id AND ea.year = o.year AND ea.month = o.month
      WHERE e.group_id = ?
      ORDER BY e.created_at DESC, o.year ASC, o.month ASC
    `).all(groupId) ?? [];

    const occurrenceIds = new Map();
    const matchedRollingSlots = new Map();
    rowsWithSlots.forEach((row) => {
      if (!entriesMap.has(row.id)) {
        entriesMap.set(row.id, {
          id: row.id,
          name: row.name,
          type: row.type,
          created_at: row.created_at,
          updated_at: row.updated_at,
          recurrent: Boolean(row.recurrent),
          recurrence_amount: Number(row.recurrence_amount) || 0,
          amounts: new Array(12).fill(0),
          resolved: new Array(12).fill(false),
          dismissed: new Array(12).fill(false),
          occurrenceIds: new Array(12).fill(null),
        });
        matchedRollingSlots.set(row.id, new Array(12).fill(false));
      }
      if (!row.year || !row.month) return;
      const index = nextMonths.findIndex(
        (slot) => slot.year === row.year && slot.month === row.month
      );
      if (index >= 0) {
        const entry = entriesMap.get(row.id);
        matchedRollingSlots.get(row.id)[index] = true;
        entry.resolved[index] = Boolean(row.is_resolved);
        entry.dismissed[index] = Boolean(row.is_dismissed);
        if (row.occurrence_id) {
          entry.occurrenceIds[index] = row.occurrence_id;
        }
        const amount = row.amount ?? row.legacy_amount ?? 0;
        entry.amounts[index] = row.is_resolved || row.is_dismissed ? 0 : Number(amount) || 0;
      }
    });

    // Older versions stored a rolling 12-month window as calendar-month slots
    // and the year migration assigned every legacy row the same year. For
    // slots whose target year has no exact occurrence yet, fall back to the
    // preserved calendar-month amount. This keeps the old values visible in
    // the rolling window without rewriting historical rows.
    const legacyAmounts = db.prepare(`
      SELECT ea.entry_id, ea.month, ea.amount
      FROM entry_amounts ea
      JOIN entries e ON e.id = ea.entry_id
      WHERE e.group_id = ?
      ORDER BY ea.year DESC, ea.updated_at DESC
    `).all(groupId) ?? [];
    const legacyByEntry = new Map();
    for (const row of legacyAmounts) {
      if (!legacyByEntry.has(row.entry_id)) legacyByEntry.set(row.entry_id, new Map());
      const values = legacyByEntry.get(row.entry_id);
      if (!values.has(row.month)) values.set(row.month, Number(row.amount) || 0);
    }
    const insertBackfilledOccurrence = db.prepare(`
      INSERT OR IGNORE INTO entry_occurrences
        (entry_id, year, month, amount, is_resolved, is_dismissed)
      VALUES (?, ?, ?, ?, 0, 0)
    `);
    const insertBackfilledAmount = db.prepare(`
      INSERT INTO entry_amounts (entry_id, month, year, amount)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(entry_id, month, year) DO NOTHING
    `);
    for (const [entryId, entry] of entriesMap) {
      const matched = matchedRollingSlots.get(entryId) || [];
      const values = legacyByEntry.get(entryId);
      if (!values) continue;
      entry.amounts = backfillLegacyRollingAmounts(
        entry.amounts,
        matched,
        legacyAmounts.filter((row) => row.entry_id === entryId),
        nextMonths
      );
      for (let index = 0; index < 12; index++) {
        if (matched[index]) continue;
        const slot = nextMonths[index];
        if (!values.has(slot.month)) continue;
        const amount = entry.amounts[index];
        const backfilled = insertBackfilledOccurrence.run(entryId, slot.year, slot.month, amount);
        insertBackfilledAmount.run(entryId, slot.month, slot.year, amount);
        const occurrence = db.prepare("SELECT id, amount, is_resolved, is_dismissed FROM entry_occurrences WHERE entry_id = ? AND year = ? AND month = ?").get(entryId, slot.year, slot.month);
        entry.occurrenceIds[index] = occurrence?.id ?? null;
        entry.resolved[index] = Boolean(occurrence?.is_resolved);
        entry.dismissed[index] = Boolean(occurrence?.is_dismissed);
        entry.amounts[index] = occurrence?.is_resolved || occurrence?.is_dismissed ? 0 : Number(occurrence?.amount ?? amount) || 0;
      }
    }

    const occurrenceRows = db.prepare(`
      SELECT o.id AS occurrence_id, o.entry_id, o.year, o.month
      FROM entry_occurrences o JOIN entries e ON e.id = o.entry_id
      WHERE e.group_id = ?
    `).all(groupId);
    occurrenceRows.forEach((row) => {
      const index = nextMonths.findIndex((slot) => slot.year === row.year && slot.month === row.month);
      const entry = entriesMap.get(row.entry_id);
      if (entry && index >= 0) entry.occurrenceIds[index] = row.occurrence_id;
    });

    const entries = Array.from(entriesMap.values());
    const pending = db.prepare(`
      SELECT e.id AS entry_id, e.name, e.type, o.id AS occurrence_id, o.year, o.month, o.amount
      FROM entry_occurrences o
      JOIN entries e ON e.id = o.entry_id
      WHERE e.group_id = ? AND o.is_resolved = 0 AND o.is_dismissed = 0 AND o.amount != 0
        AND (o.year < ? OR (o.year = ? AND o.month < ?))
      ORDER BY o.year ASC, o.month ASC, e.name COLLATE NOCASE ASC
    `).all(groupId, currentYear, currentYear, currentMonth) ?? [];

    const lastUpdatedInfo = db.prepare(
      "SELECT MAX(updated_at) as last_updated, user_id as last_updated_user_id FROM entries WHERE group_id = ?"
    ).get(groupId);

    return NextResponse.json({
      entries,
      pending: pending.map((row) => ({
        entryId: String(row.entry_id),
        description: row.name,
        type: row.type,
        year: row.year,
        month: row.month,
        amount: Number(row.amount) || 0,
        occurrenceId: row.occurrence_id,
        isIncome: row.type === "income",
      })),
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
      let insertedCount = 0;
      for (const entry of entries) {
        if (entry.name && entry.type && entry.amounts) {
          const existing = db.prepare(`
            SELECT id FROM entries WHERE group_id = ? AND name = ? COLLATE NOCASE AND type = ?
          `).get(groupId, entry.name, entry.type);
          const existingId = existing?.id;
          let entryId = existingId;
          if (existingId) {
            db.prepare("UPDATE entries SET recurrent = ?, recurrence_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
              .run(entry.recurrent ? 1 : 0, Number(entry.recurrenceAmount) || 0, existingId);
          } else {
            const result = db.prepare(`
              INSERT INTO entries
                (group_id, user_id, name, type, recurrent, recurrence_amount, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).run(groupId, user.id, entry.name, entry.type, entry.recurrent ? 1 : 0, Number(entry.recurrenceAmount) || 0);
            entryId = result.lastInsertRowid;
          }

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
            const now = new Date();
            for (let monthIndex = 0; monthIndex < amounts.length; monthIndex++) {
              const amount = parseFloat(amounts[monthIndex]) || 0;
              const date = new Date(now.getFullYear(), now.getMonth() + monthIndex, 1);
              const year = date.getFullYear();
              const month = date.getMonth() + 1;
              db.prepare(
                `INSERT INTO entry_amounts (entry_id, month, year, amount, created_at, updated_at)
                 VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 ON CONFLICT(entry_id, month, year) DO UPDATE SET amount = excluded.amount, updated_at = CURRENT_TIMESTAMP`
              ).run(entryId, month, year, amount);
              db.prepare(
                `INSERT INTO entry_occurrences
                  (entry_id, year, month, amount, is_resolved, created_at, updated_at)
                 VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 ON CONFLICT(entry_id, year, month) DO UPDATE SET amount = excluded.amount, updated_at = CURRENT_TIMESTAMP`
              ).run(entryId, year, month, amount);
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
    const { id, name, month, amount, year, is_resolved, recurrent, recurrence_amount, occurrence_id } = body || {};
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

    if (recurrent !== undefined) {
      const enabled = recurrent === true;
      const recurringAmount = Number(recurrence_amount) || 0;
      db.prepare(
        `UPDATE entries SET recurrent = ?, recurrence_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).run(enabled ? 1 : 0, recurringAmount, id);

      if (enabled) {
        const today = new Date();
        const updateExisting = db.prepare(`
          UPDATE entry_occurrences SET amount = ?, updated_at = CURRENT_TIMESTAMP
          WHERE entry_id = ? AND year = ? AND month = ? AND is_resolved = 0
        `);
        const insertMonthlyAmount = db.prepare(`
          INSERT OR REPLACE INTO entry_amounts
            (entry_id, month, year, amount, created_at, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);
        const insert = db.prepare(`
          INSERT OR IGNORE INTO entry_occurrences
            (entry_id, year, month, amount, is_resolved)
          VALUES (?, ?, ?, ?, 0)
        `);
        const results = db.transaction(() => {
          const inserted = [];
          for (let offset = 0; offset < 12; offset++) {
            const date = new Date(today.getFullYear(), today.getMonth() + offset, 1);
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            const insertResult = insert.run(id, year, month, recurringAmount);
            if (insertResult.changes > 0) {
              insertMonthlyAmount.run(id, month, year, recurringAmount);
              inserted.push({ month, year });
            } else {
              updateExisting.run(recurringAmount, id, year, month);
              db.prepare("UPDATE entry_amounts SET amount = ?, updated_at = CURRENT_TIMESTAMP WHERE entry_id = ? AND year = ? AND month = ?").run(recurringAmount, id, year, month);
            }
          }
          return inserted;
        })();
        void results;
      }
      updates.recurrent = enabled;
      updates.recurrence_amount = recurringAmount;
    }

    if (month !== undefined && amount !== undefined) {
      const numericMonth = Number(month);
      const numericAmount = Number(amount) || 0;
      const numericYear = Number(year) || new Date().getFullYear();
      if (!Number.isInteger(numericMonth) || numericMonth < 1 || numericMonth > 12 || !Number.isInteger(numericYear) || numericYear < 1900 || numericYear > 9999 || !Number.isFinite(numericAmount) || Math.abs(numericAmount) > 1_000_000_000) {
        return NextResponse.json({ error: "Invalid month, year, or amount" }, { status: 400 });
      }

      db.prepare(
        `INSERT OR REPLACE INTO entry_amounts (entry_id, month, year, amount, created_at, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).run(id, numericMonth, numericYear, numericAmount);
      db.prepare(`
        INSERT INTO entry_occurrences (entry_id, year, month, amount, is_resolved)
        VALUES (?, ?, ?, ?, 0)
        ON CONFLICT(entry_id, year, month) DO UPDATE SET
          amount = excluded.amount,
          updated_at = CURRENT_TIMESTAMP
      `).run(id, numericYear, numericMonth, numericAmount);

      updates.month = numericMonth;
      updates.year = numericYear;
      updates.amount = numericAmount;
    }

    if (is_resolved !== undefined) {
      const numericMonth = Number(month);
      const numericYear = Number(year);
      if (!Number.isInteger(numericMonth) || numericMonth < 1 || numericMonth > 12 || !Number.isInteger(numericYear)) {
        return NextResponse.json({ error: "Valid month and year are required" }, { status: 400 });
      }
      let bankUpdate = null;
      if (is_resolved) {
        const applyResolution = db.transaction(() => {
          const target = occurrence_id !== undefined
            ? db.prepare(`
                SELECT o.id, o.entry_id, o.year, o.month, o.amount, o.is_resolved, e.type, e.name
                FROM entry_occurrences o JOIN entries e ON e.id = o.entry_id
                WHERE o.id = ? AND o.entry_id = ? AND e.group_id = ?
              `).get(occurrence_id, id, groupId)
            : db.prepare(`
                SELECT o.id, o.entry_id, o.year, o.month, o.amount, o.is_resolved, e.type, e.name
                FROM entry_occurrences o JOIN entries e ON e.id = o.entry_id
                WHERE o.entry_id = ? AND o.year = ? AND o.month = ? AND e.group_id = ?
              `).get(id, numericYear, numericMonth, groupId);
          if (!target || target.year !== numericYear || target.month !== numericMonth) {
            return { error: "Occurrence not found" };
          }
          if (target.is_resolved) {
            const current = db.prepare("SELECT amount FROM bank_amounts WHERE group_id = ? ORDER BY updated_at DESC LIMIT 1").get(groupId);
            return { alreadyResolved: true, bankAmount: Number(current?.amount) || 0 };
          }

          let amountToApply = Number(target.amount) || 0;
          if (amountToApply === 0) {
            amountToApply = Number(db.prepare("SELECT amount FROM entry_amounts WHERE entry_id = ? AND year = ? AND month = ?").get(id, numericYear, numericMonth)?.amount) || 0;
          }
          const current = db.prepare("SELECT amount FROM bank_amounts WHERE group_id = ? ORDER BY updated_at DESC LIMIT 1").get(groupId);
          const oldAmount = Number(current?.amount) || 0;
          const { nextBalance: newAmount, appliedDelta: actualDelta } = applyOccurrenceToBalance(oldAmount, target.type, amountToApply);

          const resolved = db.prepare("UPDATE entry_occurrences SET is_resolved = 1, amount = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_resolved = 0").run(target.id);
          if (!resolved.changes) return { alreadyResolved: true, bankAmount: oldAmount };
          db.prepare("UPDATE entry_amounts SET amount = 0, updated_at = CURRENT_TIMESTAMP WHERE entry_id = ? AND year = ? AND month = ?").run(id, numericYear, numericMonth);

          if (actualDelta !== 0) {
            db.prepare("INSERT INTO bank_amounts (group_id, user_id, amount, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)").run(groupId, user.id, newAmount);
            db.prepare(`INSERT INTO balance_history (group_id, user_id, old_amount, new_amount, delta, note, created_at)
              VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
              .run(groupId, user.id, oldAmount, newAmount, actualDelta, `Resolved ${target.type}: ${target.name}`);
          }
          return { alreadyResolved: false, bankAmount: newAmount, operationType: actualDelta >= 0 ? "add" : "subtract" };
        });
        const result = applyResolution();
        if (result.error) return NextResponse.json({ error: result.error }, { status: 404 });
        bankUpdate = result;
        if (!result.alreadyResolved && result.bankAmount !== undefined) {
          notifyBankAmountChange(groupId, result.bankAmount, result.operationType);
        }
      } else {
        const entryAmount = db.prepare(`SELECT amount FROM entry_amounts WHERE entry_id = ? AND year = ? AND month = ?`).get(id, numericYear, numericMonth);
        db.prepare(`
          INSERT INTO entry_occurrences (entry_id, year, month, amount, is_resolved)
          VALUES (?, ?, ?, COALESCE(?, 0), 0)
          ON CONFLICT(entry_id, year, month) DO UPDATE SET
            is_resolved = 0,
            amount = COALESCE(?, entry_occurrences.amount),
            updated_at = CURRENT_TIMESTAMP
        `).run(id, numericYear, numericMonth, entryAmount?.amount ?? null, entryAmount?.amount ?? null);
      }
      updates.is_resolved = Boolean(is_resolved);
      updates.month = numericMonth;
      updates.year = numericYear;
    }

    if (body?.is_dismissed !== undefined) {
      const numericMonth = Number(month);
      const numericYear = Number(year);
      if (!Number.isInteger(numericMonth) || numericMonth < 1 || numericMonth > 12 || !Number.isInteger(numericYear)) {
        return NextResponse.json({ error: "Valid month and year are required" }, { status: 400 });
      }
      const occurrenceId = body.occurrence_id;
      if (occurrenceId !== undefined) {
        const occurrence = db.prepare(`SELECT id FROM entry_occurrences WHERE id = ? AND entry_id = ?`).get(occurrenceId, id);
        if (!occurrence) return NextResponse.json({ error: "Occurrence not found" }, { status: 404 });
        db.prepare("UPDATE entry_occurrences SET is_dismissed = ?, amount = CASE WHEN ? = 1 THEN 0 ELSE COALESCE((SELECT amount FROM entry_amounts WHERE entry_id = ? AND year = ? AND month = ?), amount) END, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(body.is_dismissed ? 1 : 0, body.is_dismissed ? 1 : 0, id, numericYear, numericMonth, occurrenceId);
        if (body.is_dismissed) db.prepare("UPDATE entry_amounts SET amount = 0, updated_at = CURRENT_TIMESTAMP WHERE entry_id = ? AND year = ? AND month = ?").run(id, numericYear, numericMonth);
      } else {
        db.prepare("UPDATE entry_occurrences SET is_dismissed = ?, amount = CASE WHEN ? = 1 THEN 0 ELSE COALESCE((SELECT amount FROM entry_amounts WHERE entry_id = ? AND year = ? AND month = ?), amount) END, updated_at = CURRENT_TIMESTAMP WHERE entry_id = ? AND year = ? AND month = ?").run(body.is_dismissed ? 1 : 0, body.is_dismissed ? 1 : 0, id, numericYear, numericMonth, id, numericYear, numericMonth);
        if (body.is_dismissed) db.prepare("UPDATE entry_amounts SET amount = 0, updated_at = CURRENT_TIMESTAMP WHERE entry_id = ? AND year = ? AND month = ?").run(id, numericYear, numericMonth);
      }
      updates.is_dismissed = Boolean(body.is_dismissed);
      updates.month = numericMonth;
      updates.year = numericYear;
    }

    notifyEntryChange(groupId, "update", {
      entryId: id,
      updates,
      timestamp: Date.now(),
    });

    return NextResponse.json({ success: true, updates, ...(is_resolved && bankUpdate ? { bankAmount: bankUpdate.bankAmount, alreadyResolved: bankUpdate.alreadyResolved } : {}) });
  } catch (error) {
    console.error("Patch entry error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

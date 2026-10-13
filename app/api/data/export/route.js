import { NextResponse } from "next/server";
import { getDatabase } from "../../../../lib/database.js";
import {
  withAuth,
  getAuthenticatedUser,
} from "../../../../lib/auth-middleware.js";
import { serializeFinanceBackup } from "../../../../lib/finance-backup.js";

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

    const db = getDatabase();

    const bankAmount = db.prepare(
      "SELECT amount FROM bank_amounts WHERE group_id = ? ORDER BY updated_at DESC LIMIT 1"
    ).get(groupId);

    const entryRows = db.prepare(`
      SELECT
        e.id, e.name, e.type, e.recurrent, e.recurrence_amount,
        slots.year, slots.month, o.amount, o.is_resolved, o.is_dismissed,
        ea.amount AS legacy_amount
      FROM entries e
      LEFT JOIN (
        SELECT entry_id, year, month FROM entry_amounts
        UNION
        SELECT entry_id, year, month FROM entry_occurrences
      ) slots ON slots.entry_id = e.id
      LEFT JOIN entry_occurrences o
        ON o.entry_id = e.id AND o.year = slots.year AND o.month = slots.month
      LEFT JOIN entry_amounts ea
        ON ea.entry_id = e.id AND ea.year = slots.year AND ea.month = slots.month
      WHERE e.group_id = ?
      ORDER BY e.type, e.name COLLATE NOCASE, slots.year, slots.month
    `).all(groupId) ?? [];

    const entriesById = new Map();
    for (const row of entryRows) {
      if (!entriesById.has(row.id)) {
        entriesById.set(row.id, {
          name: row.name,
          type: row.type,
          recurrent: Boolean(row.recurrent),
          recurrenceAmount: Number(row.recurrence_amount) || 0,
          months: [],
        });
      }
      if (row.year === null || row.month === null) continue;
      entriesById.get(row.id).months.push({
        year: row.year,
        month: row.month,
        amount: Number(row.amount ?? row.legacy_amount) || 0,
        resolved: Boolean(row.is_resolved),
        dismissed: Boolean(row.is_dismissed),
      });
    }

    const now = new Date();
    const rollingSlots = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() + index, 1);
      return { year: date.getFullYear(), month: date.getMonth() + 1 };
    });
    const existingEntryIds = Array.from(entriesById.keys());
    const occurrenceAmountsByEntry = new Map();
    if (existingEntryIds.length > 0) {
      const placeholders = existingEntryIds.map(() => "?").join(",");
      const occurrenceRows = db.prepare(`
        SELECT entry_id, year, month, amount, is_resolved, is_dismissed
        FROM entry_occurrences
        WHERE entry_id IN (${placeholders})
      `).all(...existingEntryIds);
      for (const row of occurrenceRows) {
        if (!occurrenceAmountsByEntry.has(row.entry_id)) {
          occurrenceAmountsByEntry.set(row.entry_id, new Map());
        }
        occurrenceAmountsByEntry.get(row.entry_id).set(
          `${row.year}-${row.month}`,
          row
        );
      }
    }

    // Materialize the app's existing recurring projection in the export only;
    // do not write generated occurrences while downloading a backup.
    for (const [entryId, entry] of entriesById) {
      if (!entry.recurrent || entry.recurrenceAmount <= 0) continue;
      const monthsByKey = new Map(
        entry.months.map((month) => [`${month.year}-${month.month}`, month])
      );
      const storedOccurrences = occurrenceAmountsByEntry.get(entryId);
      for (const slot of rollingSlots) {
        const key = `${slot.year}-${slot.month}`;
        if (monthsByKey.has(key)) continue;
        const storedOccurrence = storedOccurrences?.get(key);
        entry.months.push({
          year: slot.year,
          month: slot.month,
          amount: storedOccurrence
            ? Number(storedOccurrence.amount) || 0
            : entry.recurrenceAmount,
          resolved: Boolean(storedOccurrence?.is_resolved),
          dismissed: Boolean(storedOccurrence?.is_dismissed),
        });
      }
      entry.months.sort((left, right) => left.year - right.year || left.month - right.month);
    }

    const csv = serializeFinanceBackup({
      bankAmount: Math.max(0, Number(bankAmount?.amount) || 0),
      entries: Array.from(entriesById.values()),
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="finance-tracker-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Export data error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

import { applyOccurrenceToBalance } from "./rolling-months.js";

/** Resolve one dated entry occurrence and atomically apply its cash movement. */
export function resolveEntryOccurrence(db, { groupId, userId, entryId, year, month, occurrenceId }) {
  return db.transaction(() => {
    if (!Number.isInteger(Number(groupId)) || Number(groupId) <= 0 || !Number.isInteger(Number(entryId)) || Number(entryId) <= 0 || !Number.isInteger(year) || year < 1900 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) {
      return { error: "Invalid occurrence identity" };
    }
    const target = occurrenceId !== undefined && occurrenceId !== null
      ? db.prepare(`SELECT o.id, o.entry_id, o.year, o.month, o.amount, o.is_resolved,
          e.type, e.name, e.is_credit_card
        FROM entry_occurrences o JOIN entries e ON e.id = o.entry_id
        WHERE o.id = ? AND o.entry_id = ? AND e.group_id = ?`)
        .get(occurrenceId, entryId, groupId)
      : db.prepare(`SELECT o.id, o.entry_id, o.year, o.month, o.amount, o.is_resolved,
          e.type, e.name, e.is_credit_card
        FROM entry_occurrences o JOIN entries e ON e.id = o.entry_id
        WHERE o.entry_id = ? AND o.year = ? AND o.month = ? AND e.group_id = ?`)
        .get(entryId, year, month, groupId);

    if (!target || target.year !== year || target.month !== month) return { error: "Occurrence not found" };

  const currentRow = db.prepare(
      "SELECT amount FROM bank_amounts WHERE group_id = ? ORDER BY id DESC LIMIT 1"
  ).get(groupId);
  const currentBalance = Number(currentRow?.amount) || 0;
  if (target.is_resolved) return { alreadyResolved: true, bankAmount: currentBalance };

  if (!Number.isFinite(currentBalance) || !Number.isFinite(Number(target.amount))) {
    return { error: "Occurrence contains an invalid amount" };
  }

  if (target.is_credit_card && !db.prepare("SELECT id FROM credit_cards WHERE entry_id = ? AND group_id = ?").get(entryId, groupId)) {
    return { error: "Credit card entry is missing its card record." };
  }

    let amount = Number(target.amount) || 0;
    if (target.is_credit_card) {
      amount = Number(db.prepare(`SELECT COALESCE(SUM(i.amount), 0) AS amount
        FROM credit_installments i JOIN credit_purchases p ON p.id = i.purchase_id
        JOIN credit_cards c ON c.id = p.card_id
        WHERE c.entry_id = ? AND i.year = ? AND i.month = ? AND i.is_paid = 0`)
        .get(entryId, year, month)?.amount) || amount;
      if (amount <= 0) return { error: "There is no unpaid balance to resolve for this card bill." };
    } else if (amount === 0) {
      amount = Number(db.prepare(
        "SELECT amount FROM entry_amounts WHERE entry_id = ? AND year = ? AND month = ?"
      ).get(entryId, year, month)?.amount) || 0;
    }
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) {
      return { error: "Occurrence contains an invalid amount" };
    }

    const { nextBalance, appliedDelta } = applyOccurrenceToBalance(currentBalance, target.type, amount);
    const resolved = db.prepare(`UPDATE entry_occurrences
      SET is_resolved = 1, amount = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND is_resolved = 0`).run(target.id);
    if (!resolved.changes) return { alreadyResolved: true, bankAmount: currentBalance };

    db.prepare(`UPDATE entry_amounts SET amount = 0, updated_at = CURRENT_TIMESTAMP
      WHERE entry_id = ? AND year = ? AND month = ?`).run(entryId, year, month);

    if (target.is_credit_card) {
      db.prepare(`UPDATE credit_installments SET is_paid = 1
        WHERE purchase_id IN (SELECT p.id FROM credit_purchases p WHERE p.card_id =
          (SELECT c.id FROM credit_cards c WHERE c.entry_id = ?))
          AND year = ? AND month = ? AND is_paid = 0`).run(entryId, year, month);
    }

    if (appliedDelta !== 0) {
      db.prepare(`INSERT INTO bank_amounts (group_id, user_id, amount, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)`).run(groupId, userId, nextBalance);
      db.prepare(`INSERT INTO balance_history
        (group_id, user_id, old_amount, new_amount, delta, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .run(groupId, userId, currentBalance, nextBalance, appliedDelta,
          `Resolved ${target.type}: ${target.name}`);
    }

    return {
      alreadyResolved: false,
      bankAmount: nextBalance,
      operationType: appliedDelta >= 0 ? "add" : "subtract",
      appliedAmount: amount,
    };
  })();
}

export function getInstallmentMonths(startYear, startMonth, count) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(startYear, startMonth - 1 + index, 1);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  });
}

/** Ordinary card purchases are billed next month; installments default two months out. */
export function getDefaultCreditPurchaseStart(isInstallment, referenceDate = new Date()) {
  const offset = isInstallment ? 2 : 1;
  const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + offset, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function calculateAvailableCredit(creditLimit, unpaidInstallmentAmounts) {
  const limit = Number(creditLimit);
  const outstanding = unpaidInstallmentAmounts.reduce((total, amount) => total + (Number(amount) || 0), 0);
  return (Number.isFinite(limit) ? limit : 0) - outstanding;
}

export function getCreditCardCreditSummary(db, cardId) {
  const card = db.prepare("SELECT credit_limit FROM credit_cards WHERE id = ?").get(cardId);
  if (!card) return null;
  const unpaidAmounts = db.prepare(`SELECT i.amount
    FROM credit_installments i
    JOIN credit_purchases p ON p.id = i.purchase_id
    WHERE p.card_id = ? AND p.cancelled_at IS NULL AND i.is_paid = 0`).all(cardId)
    .map((row) => Number(row.amount) || 0);
  const creditLimit = Number(card.credit_limit) || 0;
  const outstandingCredit = unpaidAmounts.reduce((sum, amount) => sum + amount, 0);
  return {
    creditLimit,
    outstandingCredit,
    availableCredit: calculateAvailableCredit(creditLimit, unpaidAmounts),
  };
}

export function reopenCardBillForInstallment(db, entryId, year, month) {
  db.prepare(`UPDATE entry_occurrences
    SET is_resolved = 0, is_dismissed = 0, amount = 0, updated_at = CURRENT_TIMESTAMP
    WHERE entry_id = ? AND year = ? AND month = ?`).run(entryId, year, month);
}

/** Restore an installment schedule's unpaid portion without undoing settled bills. */
export function replaceUnpaidCreditInstallments(db, {
  purchaseId,
  entryId,
  schedule,
  amount,
  count,
}) {
  const paid = db.prepare(`SELECT id, year, month FROM credit_installments
    WHERE purchase_id = ? AND is_paid = 1 ORDER BY year, month`).all(purchaseId);
  const paidDates = new Set(paid.map((item) => `${item.year}-${item.month}`));
  const unpaidCount = Math.max(0, count - paid.length);
  const paidTotal = Number(db.prepare("SELECT COALESCE(SUM(amount), 0) AS amount FROM credit_installments WHERE purchase_id = ? AND is_paid = 1").get(purchaseId)?.amount) || 0;
  db.prepare("DELETE FROM credit_installments WHERE purchase_id = ? AND is_paid = 0").run(purchaseId);

  const insert = db.prepare(`INSERT INTO credit_installments
    (purchase_id, year, month, amount, is_paid) VALUES (?, ?, ?, ?, 0)`);
  let inserted = 0;
  for (const slot of schedule) {
    if (paidDates.has(`${slot.year}-${slot.month}`) || inserted >= unpaidCount) continue;
    insert.run(purchaseId, slot.year, slot.month, amount);
    reopenCardBillForInstallment(db, entryId, slot.year, slot.month);
    inserted++;
  }

  db.prepare(`UPDATE credit_purchases
    SET purchase_amount = ?, installment_amount = ?, installment_count = ?,
      start_year = ?, start_month = ?, cancelled_at = NULL
    WHERE id = ?`).run(
    paidTotal + amount * inserted, amount, paid.length + inserted,
    schedule[0]?.year ?? new Date().getFullYear(),
    schedule[0]?.month ?? new Date().getMonth() + 1,
    purchaseId
  );
}

/** Sync saved purchase schedules into each card's ordinary expense occurrence. */
export function syncCreditCardBills(db, groupId) {
  const cards = db.prepare(
    "SELECT id, entry_id FROM credit_cards WHERE group_id = ?"
  ).all(groupId);
  const sumForMonth = db.prepare(`
    SELECT COALESCE(SUM(i.amount), 0) AS amount
    FROM credit_installments i
    JOIN credit_purchases p ON p.id = i.purchase_id
    WHERE p.card_id = ? AND i.year = ? AND i.month = ? AND i.is_paid = 0
  `);
  const upsertOccurrence = db.prepare(`
    INSERT INTO entry_occurrences (entry_id, year, month, amount, is_resolved, is_dismissed)
    VALUES (?, ?, ?, ?, 0, 0)
    ON CONFLICT(entry_id, year, month) DO UPDATE SET
      amount = excluded.amount,
      updated_at = CURRENT_TIMESTAMP
    WHERE entry_occurrences.is_resolved = 0 AND entry_occurrences.is_dismissed = 0
  `);
  const upsertAmount = db.prepare(`
    INSERT INTO entry_amounts (entry_id, month, year, amount)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(entry_id, month, year) DO UPDATE SET
      amount = excluded.amount, updated_at = CURRENT_TIMESTAMP
      WHERE EXISTS (
      SELECT 1 FROM entry_occurrences o
      WHERE o.entry_id = excluded.entry_id AND o.year = excluded.year AND o.month = excluded.month
        AND o.is_resolved = 0 AND o.is_dismissed = 0
    )
  `);

  const sync = db.transaction(() => {
    for (const card of cards) {
      const months = db.prepare(`
        SELECT year, month FROM entry_occurrences WHERE entry_id = ?
        UNION
        SELECT i.year, i.month FROM credit_installments i
        JOIN credit_purchases p ON p.id = i.purchase_id WHERE p.card_id = ?
      `).all(card.entry_id, card.id);
      for (const slot of months) {
        const occurrence = db.prepare("SELECT is_resolved, is_dismissed FROM entry_occurrences WHERE entry_id = ? AND year = ? AND month = ?").get(card.entry_id, slot.year, slot.month);
        const amount = occurrence?.is_resolved
          ? 0
          : Number(sumForMonth.get(card.id, slot.year, slot.month)?.amount) || 0;
        if (!occurrence) {
          db.prepare(`INSERT INTO entry_occurrences (entry_id, year, month, amount, is_resolved, is_dismissed)
            VALUES (?, ?, ?, ?, 0, 0)`).run(card.entry_id, slot.year, slot.month, amount);
          db.prepare(`INSERT INTO entry_amounts (entry_id, month, year, amount)
            VALUES (?, ?, ?, ?) ON CONFLICT(entry_id, month, year) DO UPDATE SET amount = excluded.amount, updated_at = CURRENT_TIMESTAMP`)
            .run(card.entry_id, slot.month, slot.year, amount);
        } else {
          upsertOccurrence.run(card.entry_id, slot.year, slot.month, amount);
          upsertAmount.run(card.entry_id, slot.month, slot.year, amount);
        }
      }
    }
  });
  sync();
}

export function getCreditCardExpenseEntries(db, groupId, slots) {
  const cards = db.prepare(`
    SELECT c.id AS card_id, c.name, c.entry_id
    FROM credit_cards c
    WHERE c.group_id = ?
    ORDER BY c.name COLLATE NOCASE
  `).all(groupId);

  return cards.map((card) => {
    const amountRows = db.prepare(`
      SELECT year, month, amount, is_resolved, is_dismissed, id AS occurrence_id
      FROM entry_occurrences
      WHERE entry_id = ?
    `).all(card.entry_id);
    const byDate = new Map(amountRows.map((row) => [`${row.year}-${row.month}`, row]));
    const amounts = new Array(12).fill(0);
    const pendingAmounts = new Array(12).fill(0);
    const resolved = new Array(12).fill(false);
    const dismissed = new Array(12).fill(false);
    const occurrenceIds = new Array(12).fill(null);
    slots.forEach((slot, index) => {
      const row = byDate.get(`${slot.year}-${slot.month}`);
      if (!row) return;
      const amount = Number(row.amount) || 0;
      amounts[index] = amount;
      pendingAmounts[index] = row.is_resolved || row.is_dismissed ? 0 : amount;
      resolved[index] = Boolean(row.is_resolved);
      dismissed[index] = Boolean(row.is_dismissed);
      occurrenceIds[index] = row.occurrence_id;
    });
    return {
      id: String(card.entry_id),
      name: card.name,
      description: card.name,
      amounts,
      pendingAmounts,
      resolved,
      dismissed,
      occurrenceIds,
      isCreditCard: true,
      cardId: String(card.card_id),
    };
  });
}

export function getCreditCardsWithPurchases(db, groupId) {
  const cards = db.prepare(`
    SELECT c.id, c.name, c.entry_id
    FROM credit_cards c
    WHERE c.group_id = ?
    ORDER BY c.name COLLATE NOCASE
  `).all(groupId);
  const purchaseQuery = db.prepare(`
    SELECT p.id, p.description, p.purchase_amount, p.installment_amount, p.installment_count,
      p.start_year, p.start_month, p.cancelled_at,
      i.year, i.month, i.amount, i.is_paid, o.is_dismissed
    FROM credit_purchases p
    LEFT JOIN credit_installments i ON i.purchase_id = p.id
    LEFT JOIN entries e ON e.credit_card_id = p.card_id
    LEFT JOIN entry_occurrences o ON o.entry_id = e.id AND o.year = i.year AND o.month = i.month
    WHERE p.card_id = ?
    ORDER BY p.created_at DESC, i.year, i.month
  `);
  return cards.map((card) => {
    const purchases = new Map();
    for (const row of purchaseQuery.all(card.id)) {
      if (!purchases.has(row.id)) {
        purchases.set(row.id, {
          id: String(row.id),
          description: row.description,
          purchaseAmount: Number(row.purchase_amount) || 0,
          installmentAmount: Number(row.installment_amount) || 0,
          installmentCount: row.installment_count,
          startYear: row.start_year,
          startMonth: row.start_month,
          cancelled: Boolean(row.cancelled_at),
          hasPaidInstallments: false,
          installments: [],
        });
      }
      if (row.year !== null) {
        if (row.is_paid) purchases.get(row.id).hasPaidInstallments = true;
        purchases.get(row.id).installments.push({
          year: row.year,
          month: row.month,
          amount: Number(row.amount) || 0,
          inForecast: row.year * 12 + row.month >= new Date().getFullYear() * 12 + new Date().getMonth() + 1 && row.year * 12 + row.month < new Date().getFullYear() * 12 + new Date().getMonth() + 13,
          resolved: Boolean(row.is_paid),
          dismissed: Boolean(row.is_dismissed),
        });
      }
    }
    const creditSummary = getCreditCardCreditSummary(db, card.id);
    return {
      id: String(card.id),
      name: card.name,
      entryId: String(card.entry_id),
      ...creditSummary,
      purchases: Array.from(purchases.values()),
    };
  });
}

export function validateCreditCardName(name) {
  return typeof name === "string" && name.trim().length > 0 && name.trim().length <= 100;
}

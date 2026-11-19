const CSV_HEADERS = [
  "record_type",
  "entry_name",
  "entry_type",
  "year",
  "month",
  "amount",
  "recurrent",
  "recurrence_amount",
  "is_resolved",
  "is_dismissed",
];

const MAX_IMPORT_ENTRIES = 5000;
const MAX_IMPORT_MONTHS = 60000;
const MAX_AMOUNT = 1_000_000_000;

function escapeCsv(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function parseCsvRows(source) {
  const text = source.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index++;
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error("Unclosed quoted CSV field.");
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((value) => value !== "")) rows.push(row);
  }
  return rows;
}

function parseStrictBoolean(value) {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  throw new Error("Invalid boolean field in CSV.");
}

function parseNumber(value, fieldName) {
  if (value.trim() === "") throw new Error(`Missing ${fieldName}.`);
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Invalid ${fieldName}.`);
  return number;
}

function validateNormalizedBackup(backup) {
  if (!backup || backup.version !== 1) {
    throw new Error("Unsupported backup version.");
  }
  if (
    typeof backup.bankAmount !== "number" ||
    !Number.isFinite(backup.bankAmount) ||
    backup.bankAmount < -MAX_AMOUNT ||
    backup.bankAmount > MAX_AMOUNT ||
    !Array.isArray(backup.entries) ||
    backup.entries.length > MAX_IMPORT_ENTRIES
  ) {
    throw new Error("Invalid backup contents.");
  }

  let totalMonths = 0;
  const seenEntries = new Set();
  for (const entry of backup.entries) {
    if (
      !entry ||
      typeof entry.name !== "string" ||
      entry.name.trim().length === 0 ||
      entry.name.length > 255 ||
      !["income", "expense"].includes(entry.type) ||
      typeof entry.recurrent !== "boolean" ||
      typeof entry.recurrenceAmount !== "number" ||
      !Number.isFinite(entry.recurrenceAmount) ||
      Math.abs(entry.recurrenceAmount) > MAX_AMOUNT ||
      !Array.isArray(entry.months)
    ) {
      throw new Error("Invalid backup entry.");
    }

    const entryKey = `${entry.type}\0${entry.name.toLocaleLowerCase()}`;
    if (seenEntries.has(entryKey)) throw new Error("Duplicate backup entry.");
    seenEntries.add(entryKey);

    const seenMonths = new Set();
    for (const month of entry.months) {
      totalMonths++;
      if (
        !month ||
        !Number.isInteger(month.year) ||
        month.year < 1900 ||
        month.year > 9999 ||
        !Number.isInteger(month.month) ||
        month.month < 1 ||
        month.month > 12 ||
        typeof month.amount !== "number" ||
        !Number.isFinite(month.amount) ||
        Math.abs(month.amount) > MAX_AMOUNT ||
        typeof month.resolved !== "boolean" ||
        typeof month.dismissed !== "boolean"
      ) {
        throw new Error("Invalid backup month record.");
      }
      const monthKey = `${month.year}-${month.month}`;
      if (seenMonths.has(monthKey)) throw new Error("Duplicate month in backup entry.");
      seenMonths.add(monthKey);
    }
  }
  if (totalMonths > MAX_IMPORT_MONTHS) throw new Error("Backup contains too many monthly records.");
  if (backup.creditCards !== undefined) {
    if (!Array.isArray(backup.creditCards) || backup.creditCards.length > MAX_IMPORT_ENTRIES) {
      throw new Error("Invalid credit card backup data.");
    }
    const seenCards = new Set();
    let purchaseCount = 0;
    for (const card of backup.creditCards) {
      if (!card || typeof card.name !== "string" || !card.name.trim() || card.name.length > 100 || !Array.isArray(card.purchases) || (card.bills !== undefined && !Array.isArray(card.bills))) {
        throw new Error("Invalid backup card.");
      }
      if (card.creditLimit !== undefined && (typeof card.creditLimit !== "number" || !Number.isFinite(card.creditLimit) || card.creditLimit < 0 || card.creditLimit > MAX_AMOUNT)) {
        throw new Error("Invalid credit limit in backup.");
      }
      if (card.creditLimit !== undefined && (typeof card.creditLimit !== "number" || !Number.isFinite(card.creditLimit) || card.creditLimit < 0 || card.creditLimit > MAX_AMOUNT)) {
        throw new Error("Invalid credit limit in backup.");
      }
      const cardKey = card.name.trim().toLocaleLowerCase();
      if (seenCards.has(cardKey)) throw new Error("Duplicate credit card in backup.");
      seenCards.add(cardKey);
      const seenBillMonths = new Set();
      for (const bill of card.bills || []) {
        if (!Number.isInteger(bill.year) || bill.year < 1900 || bill.year > 9999 || !Number.isInteger(bill.month) || bill.month < 1 || bill.month > 12 || typeof bill.resolved !== "boolean" || typeof bill.dismissed !== "boolean") throw new Error("Invalid backup card bill state.");
        const key = `${bill.year}-${bill.month}`;
        if (seenBillMonths.has(key)) throw new Error("Duplicate card bill state in backup.");
        seenBillMonths.add(key);
      }
      for (const purchase of card.purchases) {
        purchaseCount++;
        if (
          !purchase || typeof purchase.backupKey !== "string" || !purchase.backupKey ||
          typeof purchase.description !== "string" || !purchase.description.trim() || purchase.description.length > 160 ||
          typeof purchase.purchaseAmount !== "number" || !Number.isFinite(purchase.purchaseAmount) || purchase.purchaseAmount <= 0 || purchase.purchaseAmount > MAX_AMOUNT ||
          typeof purchase.installmentAmount !== "number" || !Number.isFinite(purchase.installmentAmount) || purchase.installmentAmount <= 0 || purchase.installmentAmount > MAX_AMOUNT ||
          !Number.isInteger(purchase.installmentCount) || purchase.installmentCount < 1 || purchase.installmentCount > 120 ||
          !Number.isInteger(purchase.startYear) || purchase.startYear < 1900 || purchase.startYear > 9999 ||
          !Number.isInteger(purchase.startMonth) || purchase.startMonth < 1 || purchase.startMonth > 12 ||
          typeof purchase.cancelled !== "boolean" || !Array.isArray(purchase.installments)
        ) throw new Error("Invalid backup credit purchase.");
        const installmentDates = new Set();
        for (const installment of purchase.installments) {
          if (!Number.isInteger(installment.year) || installment.year < 1900 || installment.year > 9999 || !Number.isInteger(installment.month) || installment.month < 1 || installment.month > 12 || typeof installment.amount !== "number" || !Number.isFinite(installment.amount) || installment.amount <= 0 || installment.amount > MAX_AMOUNT || typeof installment.paid !== "boolean") {
            throw new Error("Invalid backup credit installment.");
          }
          const date = `${installment.year}-${installment.month}`;
          if (installmentDates.has(date)) throw new Error("Duplicate backup credit installment.");
          installmentDates.add(date);
        }
      }
    }
    if (purchaseCount > MAX_IMPORT_ENTRIES) throw new Error("Backup contains too many purchases.");
  }
  return backup;
}

/** @param {string} text @returns {import('./finance-backup.types').FinanceBackup} */
export function parseFinanceBackup(text) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Backup file is empty.");
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    throw new Error("JSON backups are no longer supported. Import a Finance Tracker CSV export.");
  }

  const rows = parseCsvRows(text);
  const headers = rows.shift();
  if (!headers || headers.length !== CSV_HEADERS.length || headers.some((header, index) => header !== CSV_HEADERS[index])) {
    throw new Error("CSV headers do not match the Finance Tracker backup format.");
  }

  const entriesByKey = new Map();
  const cardsByName = new Map();
  const purchasesByKey = new Map();
  let bankAmount;
  let sawMetadata = false;
  let sawBank = false;
  for (const row of rows) {
    if (row.length !== CSV_HEADERS.length) throw new Error("CSV row has an incorrect number of columns.");
    const [recordType, name, type, yearRaw, monthRaw, amountRaw, recurrentRaw, recurrenceRaw, resolvedRaw, dismissedRaw] = row;

    if (recordType === "meta") {
      if (
        name !== "finance-tracker" ||
        type !== "1" ||
        yearRaw !== "" || monthRaw !== "" || amountRaw !== "" ||
        recurrentRaw !== "" || recurrenceRaw !== "" || resolvedRaw !== "" || dismissedRaw !== ""
      ) throw new Error("Unsupported Finance Tracker CSV version.");
      if (sawMetadata) throw new Error("Duplicate CSV metadata row.");
      sawMetadata = true;
      continue;
    }
    if (recordType === "bank") {
      if (
        bankAmount !== undefined || !sawMetadata || name !== "" || type !== "" ||
        yearRaw !== "" || monthRaw !== "" || amountRaw === "" ||
        recurrentRaw !== "" || recurrenceRaw !== "" || resolvedRaw !== "" || dismissedRaw !== ""
      ) throw new Error("Invalid or duplicate bank balance row.");
      bankAmount = parseNumber(amountRaw, "bank balance");
      sawBank = true;
      continue;
    }
    if (!sawMetadata || !sawBank) throw new Error("Unknown or out-of-order CSV record type.");

    if (recordType === "card") {
      if (!name || yearRaw || monthRaw || recurrentRaw || recurrenceRaw || resolvedRaw || dismissedRaw) {
        throw new Error("Invalid credit card marker row.");
      }
      const cardKey = name.trim().toLocaleLowerCase();
      const cardLimit = amountRaw === "" ? undefined : parseNumber(amountRaw, "credit limit");
      if (!cardsByName.has(cardKey)) cardsByName.set(cardKey, { name, purchases: [], bills: [], creditLimit: cardLimit });
      else if (cardLimit !== undefined) cardsByName.get(cardKey).creditLimit = cardLimit;
      continue;
    }

    if (recordType === "bill") {
      if (!name || yearRaw === "" || monthRaw === "" || amountRaw !== "" || recurrentRaw !== "" || recurrenceRaw !== "") throw new Error("Invalid credit card bill row.");
      const cardKey = name.trim().toLocaleLowerCase();
      if (!cardsByName.has(cardKey)) cardsByName.set(cardKey, { name, purchases: [], bills: [] });
      const card = cardsByName.get(cardKey);
      card.bills.push({
        year: parseNumber(yearRaw, "bill year"),
        month: parseNumber(monthRaw, "bill month"),
        resolved: parseStrictBoolean(resolvedRaw),
        dismissed: parseStrictBoolean(dismissedRaw),
      });
      continue;
    }

    if (recordType === "purchase") {
      let metadata;
      try { metadata = JSON.parse(type); } catch { throw new Error("Invalid credit purchase metadata."); }
      if (!metadata || !metadata.backupKey || !metadata.description || !name) throw new Error("Invalid credit purchase metadata.");
      const cardKey = name.trim().toLocaleLowerCase();
      if (!cardsByName.has(cardKey)) cardsByName.set(cardKey, { name, purchases: [], bills: [] });
      const purchaseKey = `${cardKey}\0${metadata.backupKey}`;
      let purchase = purchasesByKey.get(purchaseKey);
      if (!purchase) {
        purchase = { ...metadata, installments: [] };
        purchasesByKey.set(purchaseKey, purchase);
        cardsByName.get(cardKey).purchases.push(purchase);
      }
      if (yearRaw === "" && monthRaw === "" && amountRaw === "") {
        if (purchase.installments.length === 0) {
          purchase.installments = [];
        }
        continue;
      }
      purchase.installments.push({
        year: parseNumber(yearRaw, "year"),
        month: parseNumber(monthRaw, "month"),
        amount: parseNumber(amountRaw, "installment amount"),
        paid: parseStrictBoolean(resolvedRaw),
      });
      continue;
    }

    if (recordType !== "entry") throw new Error("Unknown CSV record type.");

    const entryKey = `${type}\0${name.toLocaleLowerCase()}`;
    let entry = entriesByKey.get(entryKey);
    if (!entry) {
      if (!name || !["income", "expense"].includes(type)) {
        throw new Error("Invalid CSV entry identity.");
      }
      entry = {
        name,
        type,
        recurrent: parseStrictBoolean(recurrentRaw),
        recurrenceAmount: recurrenceRaw === "" ? 0 : parseNumber(recurrenceRaw, "recurrence amount"),
        months: [],
      };
      entriesByKey.set(entryKey, entry);
    } else if (
      entry.recurrent !== parseStrictBoolean(recurrentRaw) ||
      entry.recurrenceAmount !== (recurrenceRaw === "" ? 0 : parseNumber(recurrenceRaw, "recurrence amount"))
    ) {
      throw new Error("Entry settings differ between CSV rows.");
    }

    // Entry marker rows preserve entries with no saved month amounts.
    if (yearRaw === "" && monthRaw === "" && amountRaw === "") {
      if (resolvedRaw !== "" || dismissedRaw !== "") throw new Error("Invalid empty entry marker row.");
      continue;
    }
    entry.months.push({
      year: parseNumber(yearRaw, "year"),
      month: parseNumber(monthRaw, "month"),
      amount: parseNumber(amountRaw, "amount"),
      resolved: parseStrictBoolean(resolvedRaw),
      dismissed: parseStrictBoolean(dismissedRaw),
    });
  }

  if (!sawMetadata || !sawBank) throw new Error("CSV is missing Finance Tracker metadata or bank balance.");

  const backup = {
    version: 1,
    bankAmount,
    entries: Array.from(entriesByKey.values()),
  };
  if (cardsByName.size) backup.creditCards = Array.from(cardsByName.values());
  return validateNormalizedBackup(backup);
}

/** @param {{bankAmount:number, entries:import('./finance-backup.types').FinanceBackupEntry[]}} input */
export function serializeFinanceBackup({ bankAmount, entries, creditCards = [] }) {
  validateNormalizedBackup({ version: 1, bankAmount, entries, creditCards });
  const rows = [CSV_HEADERS];
  rows.push(["meta", "finance-tracker", "1", "", "", "", "", "", "", ""]);
  rows.push(["bank", "", "", "", "", bankAmount, "", "", "", ""]);

  for (const entry of entries) {
    if (!entry.months.length) {
      rows.push([
        "entry", entry.name, entry.type, "", "", "", entry.recurrent ? 1 : 0,
        entry.recurrenceAmount, "", "",
      ]);
      continue;
    }
    for (const month of entry.months) {
      rows.push([
        "entry", entry.name, entry.type, month.year, month.month, month.amount,
        entry.recurrent ? 1 : 0, entry.recurrenceAmount,
        month.resolved ? 1 : 0, month.dismissed ? 1 : 0,
      ]);
    }
  }

  for (const card of creditCards) {
    if (card.purchases.length === 0) {
    rows.push(["card", card.name, "", "", "", card.creditLimit ?? "", "", "", "", ""]);
    } else {
      rows.push(["card", card.name, "", "", "", card.creditLimit ?? 0, "", "", "", ""]);
    }
    for (const bill of card.bills || []) {
      rows.push(["bill", card.name, "", bill.year, bill.month, "", "", "", bill.resolved ? 1 : 0, bill.dismissed ? 1 : 0]);
    }
    for (const purchase of card.purchases) {
      const metadata = JSON.stringify({
        backupKey: purchase.backupKey,
        description: purchase.description,
        purchaseAmount: purchase.purchaseAmount,
        installmentAmount: purchase.installmentAmount,
        installmentCount: purchase.installmentCount,
        startYear: purchase.startYear,
        startMonth: purchase.startMonth,
        cancelled: purchase.cancelled,
      });
      if (purchase.installments.length === 0) {
        rows.push(["purchase", card.name, metadata, "", "", "", "", "", "", ""]);
        continue;
      }
      for (const installment of purchase.installments) {
        rows.push(["purchase", card.name, metadata, installment.year, installment.month, installment.amount, "", "", installment.paid ? 1 : 0, ""]);
      }
    }
  }

  return `${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}\r\n`;
}

export function validateFinanceBackup(backup) {
  return validateNormalizedBackup(backup);
}

/** @param {import('bun:sqlite').Database} db @param {{groupId:number, userId:number, backup:import('./finance-backup.types').FinanceBackup}} options */
export function mergeFinanceBackup(db, { groupId, userId, backup }) {
  const normalized = validateNormalizedBackup(backup);
  return db.transaction(() => {
    const currentBank = db.prepare(
      "SELECT amount FROM bank_amounts WHERE group_id = ? ORDER BY id DESC LIMIT 1"
    ).get(groupId);
    const previousAmount = Number(currentBank?.amount) || 0;

    db.prepare(
      "INSERT INTO bank_amounts (group_id, user_id, amount, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)"
    ).run(groupId, userId, normalized.bankAmount);
    db.prepare(
      "INSERT INTO balance_history (group_id, user_id, old_amount, new_amount, delta, note, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
    ).run(
      groupId,
      userId,
      previousAmount,
      normalized.bankAmount,
      normalized.bankAmount - previousAmount,
      "Imported CSV backup"
    );

    const findEntry = db.prepare(
      "SELECT id FROM entries WHERE group_id = ? AND name = ? COLLATE NOCASE AND type = ? AND is_credit_card = 0"
    );
    const updateEntry = db.prepare(
      "UPDATE entries SET recurrent = ?, recurrence_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND group_id = ?"
    );
    const insertEntry = db.prepare(
      "INSERT INTO entries (group_id, user_id, name, type, recurrent, recurrence_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
    );
    const upsertAmount = db.prepare(`
      INSERT INTO entry_amounts (entry_id, month, year, amount, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(entry_id, month, year) DO UPDATE SET
        amount = excluded.amount,
        updated_at = CURRENT_TIMESTAMP
    `);
    const upsertOccurrence = db.prepare(`
      INSERT INTO entry_occurrences
        (entry_id, year, month, amount, is_resolved, is_dismissed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(entry_id, year, month) DO UPDATE SET
        amount = excluded.amount,
        is_resolved = excluded.is_resolved,
        is_dismissed = excluded.is_dismissed,
        updated_at = CURRENT_TIMESTAMP
    `);
    const findCard = db.prepare("SELECT id FROM credit_cards WHERE group_id = ? AND name = ? COLLATE NOCASE");
    const createCard = db.prepare(`
      INSERT INTO credit_cards (group_id, user_id, name, entry_id, credit_limit)
      VALUES (?, ?, ?, ?, ?)
    `);
    const updateCardLimit = db.prepare("UPDATE credit_cards SET credit_limit = ? WHERE id = ?");
    const createCardEntry = db.prepare(`
      INSERT INTO entries (group_id, user_id, name, type, is_credit_card)
      VALUES (?, ?, ?, 'expense', 1)
    `);
    const cardEntryId = db.prepare("SELECT entry_id FROM credit_cards WHERE id = ?");
    const upsertCardBill = db.prepare(`
      INSERT INTO entry_occurrences (entry_id, year, month, amount, is_resolved, is_dismissed)
      VALUES (?, ?, ?, 0, ?, ?)
      ON CONFLICT(entry_id, year, month) DO UPDATE SET
        is_resolved = excluded.is_resolved,
        is_dismissed = excluded.is_dismissed,
        updated_at = CURRENT_TIMESTAMP
    `);
    const findPurchase = db.prepare(`
      SELECT p.id FROM credit_purchases p JOIN credit_cards c ON c.id = p.card_id
      WHERE c.group_id = ? AND p.card_id = ? AND p.description = ? AND p.start_year = ? AND p.start_month = ?
        AND p.installment_count = ? AND p.purchase_amount = ?
    `);
    const createPurchase = db.prepare(`
      INSERT INTO credit_purchases (card_id, description, purchase_amount, installment_amount,
        installment_count, start_year, start_month, cancelled_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const createInstallment = db.prepare(`
      INSERT INTO credit_installments (purchase_id, year, month, amount, is_paid)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(purchase_id, year, month) DO UPDATE SET amount = excluded.amount, is_paid = excluded.is_paid
    `);
    let entriesMerged = 0;
    let monthValuesMerged = 0;
    for (const entry of normalized.entries) {
      let entryId = findEntry.get(groupId, entry.name.trim(), entry.type)?.id;
      if (entryId) {
        updateEntry.run(
          entry.recurrent ? 1 : 0,
          entry.recurrenceAmount,
          entryId,
          groupId
        );
      } else {
        entryId = insertEntry.run(
          groupId,
          userId,
          entry.name.trim(),
          entry.type,
          entry.recurrent ? 1 : 0,
          entry.recurrenceAmount
        ).lastInsertRowid;
      }

      entriesMerged++;
      for (const month of entry.months) {
        upsertAmount.run(entryId, month.month, month.year, month.amount);
        upsertOccurrence.run(
          entryId,
          month.year,
          month.month,
          month.amount,
          month.resolved ? 1 : 0,
          month.dismissed ? 1 : 0
        );
        monthValuesMerged++;
      }
    }

    let cardsMerged = 0;
    let purchasesMerged = 0;
    for (const card of normalized.creditCards || []) {
      let cardId = findCard.get(groupId, card.name.trim())?.id;
      if (!cardId) {
        const entryId = createCardEntry.run(groupId, userId, card.name.trim()).lastInsertRowid;
        cardId = createCard.run(groupId, userId, card.name.trim(), entryId, Number(card.creditLimit) || 0).lastInsertRowid;
        db.prepare("UPDATE entries SET credit_card_id = ? WHERE id = ?").run(cardId, entryId);
      } else if (card.creditLimit !== undefined) {
        updateCardLimit.run(card.creditLimit, cardId);
      }
      cardsMerged++;
      const ownerEntryId = cardEntryId.get(cardId).entry_id;
      for (const bill of card.bills || []) {
        upsertCardBill.run(ownerEntryId, bill.year, bill.month, bill.resolved ? 1 : 0, bill.dismissed ? 1 : 0);
      }
      for (const purchase of card.purchases) {
        const duplicate = findPurchase.get(groupId, cardId, purchase.description, purchase.startYear, purchase.startMonth, purchase.installmentCount, purchase.purchaseAmount);
        const purchaseId = duplicate?.id ?? createPurchase.run(
          cardId,
          purchase.description,
          purchase.purchaseAmount,
          purchase.installmentAmount,
          purchase.installmentCount,
          purchase.startYear,
          purchase.startMonth,
          purchase.cancelled ? new Date().toISOString() : null
        ).lastInsertRowid;
        purchasesMerged++;
        for (const installment of purchase.installments) {
          createInstallment.run(purchaseId, installment.year, installment.month, installment.amount, installment.paid ? 1 : 0);
        }
      }
    }

    return normalized.creditCards?.length
      ? { entriesMerged, monthValuesMerged, cardsMerged, purchasesMerged }
      : { entriesMerged, monthValuesMerged };
  })();
}

export const financeBackupCsvHeaders = CSV_HEADERS;

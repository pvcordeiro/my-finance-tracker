import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { currencies } from "./i18n.ts";
import { mergeFinanceBackup, parseFinanceBackup, serializeFinanceBackup } from "./finance-backup.js";
/** @returns {import('./finance-backup.types').FinanceBackup} */
function createBackupFixture() {
  return {
    version: 1,
    bankAmount: 1250.5,
    entries: [
      {
        name: 'Salary, "Primary"',
        type: "income",
        recurrent: true,
        recurrenceAmount: 2000,
        months: [
          { year: 2026, month: 10, amount: 2000, resolved: false, dismissed: false },
          { year: 2027, month: 1, amount: 0, resolved: true, dismissed: false },
        ],
      },
      {
        name: "Rent\nUpstairs",
        type: "expense",
        recurrent: false,
        recurrenceAmount: 0,
        months: [
          { year: 2026, month: 11, amount: 850.25, resolved: false, dismissed: true },
        ],
      },
      {
        name: "Future blank entry",
        type: "expense",
        recurrent: false,
        recurrenceAmount: 0,
        months: [],
      },
    ],
  };
}

function createMergeDatabase() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE bank_amounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      updated_at TEXT
    );
    CREATE TABLE balance_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      old_amount REAL NOT NULL,
      new_amount REAL NOT NULL,
      delta REAL NOT NULL,
      note TEXT,
      created_at TEXT
    );
    CREATE TABLE entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      recurrent INTEGER NOT NULL DEFAULT 0,
      recurrence_amount REAL NOT NULL DEFAULT 0,
      created_at TEXT,
      updated_at TEXT,
      UNIQUE(group_id, name, type)
    );
    CREATE TABLE entry_amounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT,
      updated_at TEXT,
      UNIQUE(entry_id, month, year)
    );
    CREATE TABLE entry_occurrences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      amount REAL NOT NULL,
      is_resolved INTEGER NOT NULL DEFAULT 0,
      is_dismissed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT,
      updated_at TEXT,
      UNIQUE(entry_id, year, month)
    );
  `);
  return db;
}

describe("Finance Tracker CSV backup", () => {
  test("round trips quoted descriptions, exact years, recurrence and occurrence state", () => {
    const expected = createBackupFixture();
    const csv = serializeFinanceBackup(expected);
    const parsed = parseFinanceBackup(`\uFEFF${csv}`);
    expect(parsed).toEqual(expected);
  });

  test("rejects malformed, incomplete and duplicate month data", () => {
    expect(() => parseFinanceBackup("record_type,entry_name\nentry,foo")).toThrow();

    const validRows = serializeFinanceBackup(createBackupFixture()).trim().split("\r\n");
    const duplicateMonthRow = validRows.find((row) => row.includes(",2026,10,2000,"));
    expect(duplicateMonthRow).toBeDefined();
    expect(() =>
      parseFinanceBackup([...validRows, duplicateMonthRow].join("\r\n"))
    ).toThrow("Duplicate month in backup entry.");
  });

  test("rejects JSON backups now that import is CSV-only", () => {
    expect(() => parseFinanceBackup(JSON.stringify({ bankAmount: 1 }))).toThrow(
      "JSON backups are no longer supported. Import a Finance Tracker CSV export."
    );
  });

  test("merge restore upserts included records and preserves unmentioned records and months", () => {
    const db = createMergeDatabase();
    const existingEntryId = db.prepare(`
      INSERT INTO entries (group_id, user_id, name, type, recurrent, recurrence_amount)
      VALUES (1, 7, 'Salary, "Primary"', 'income', 0, 0)
    `).run().lastInsertRowid;
    db.prepare(`
      INSERT INTO entry_amounts (entry_id, month, year, amount)
      VALUES (?, 10, 2026, 1500), (?, 12, 2026, 90)
    `).run(existingEntryId, existingEntryId);
    db.prepare(`
      INSERT INTO entry_occurrences (entry_id, year, month, amount, is_resolved, is_dismissed)
      VALUES (?, 2026, 10, 1500, 0, 0), (?, 2026, 12, 90, 0, 0)
    `).run(existingEntryId, existingEntryId);
    db.prepare(`
      INSERT INTO entries (group_id, user_id, name, type, recurrent, recurrence_amount)
      VALUES (1, 7, 'Keep me', 'expense', 0, 0)
    `).run();
    db.prepare("INSERT INTO bank_amounts (group_id, user_id, amount) VALUES (1, 7, 100)").run();

    const backup = createBackupFixture();
    const result = mergeFinanceBackup(db, {
      groupId: 1,
      userId: 7,
      backup,
    });

    expect(result).toEqual({ entriesMerged: 3, monthValuesMerged: 3 });
    expect(db.prepare("SELECT COUNT(*) AS count FROM entries WHERE group_id = 1").get().count).toBe(4);
    expect(db.prepare("SELECT amount FROM bank_amounts WHERE group_id = 1 ORDER BY id DESC LIMIT 1").get().amount).toBe(1250.5);
    expect(db.prepare("SELECT amount, is_resolved FROM entry_occurrences WHERE entry_id = ? AND year = 2027 AND month = 1").get(existingEntryId)).toEqual({ amount: 0, is_resolved: 1 });
    expect(db.prepare("SELECT amount FROM entry_amounts WHERE entry_id = ? AND year = 2026 AND month = 12").get(existingEntryId).amount).toBe(90);
    expect(db.prepare("SELECT id FROM entries WHERE name = 'Keep me'").get()).toBeDefined();
    db.close();
  });

  test("CSV parser supports currency-independent finance values and UTF-8 descriptions", () => {
    const backup = createBackupFixture();
    backup.entries[0].name = "Salário — José";
    const parsed = parseFinanceBackup(serializeFinanceBackup(backup));
    expect(parsed.entries[0].name).toBe("Salário — José");
    expect(parsed.bankAmount).toBe(1250.5);
  });

  test("expanded currency list has unique supported currency codes", () => {
    const codes = currencies.map(({ code }) => code);
    expect(codes.length).toBeGreaterThan(3);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toContain("JPY");
    expect(codes).toContain("CAD");
  });
});

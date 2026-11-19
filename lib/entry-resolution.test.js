import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { resolveEntryOccurrence } from "./entry-resolution.js";

function createResolutionDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE entries (id INTEGER PRIMARY KEY, group_id INTEGER, type TEXT, name TEXT, is_credit_card INTEGER DEFAULT 0);
    CREATE TABLE credit_cards (id INTEGER PRIMARY KEY, group_id INTEGER, entry_id INTEGER);
    CREATE TABLE credit_purchases (id INTEGER PRIMARY KEY, card_id INTEGER);
    CREATE TABLE credit_installments (id INTEGER PRIMARY KEY, purchase_id INTEGER, year INTEGER, month INTEGER, amount REAL, is_paid INTEGER DEFAULT 0);
    CREATE TABLE entry_occurrences (id INTEGER PRIMARY KEY, entry_id INTEGER, year INTEGER, month INTEGER, amount REAL, is_resolved INTEGER DEFAULT 0, is_dismissed INTEGER DEFAULT 0, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE entry_amounts (id INTEGER PRIMARY KEY, entry_id INTEGER, year INTEGER, month INTEGER, amount REAL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE bank_amounts (id INTEGER PRIMARY KEY, group_id INTEGER, user_id INTEGER, amount REAL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE balance_history (id INTEGER PRIMARY KEY, group_id INTEGER, user_id INTEGER, old_amount REAL, new_amount REAL, delta REAL, note TEXT, created_at TEXT);
  `);
  return db;
}

describe("credit-card and expense occurrence resolution", () => {
  test("paying a bill applies the full amount and preserves an overdraft", () => {
    const db = createResolutionDb();
    db.exec(`
      INSERT INTO entries VALUES (41, 3, 'expense', 'Travel card', 1);
      INSERT INTO credit_cards VALUES (7, 3, 41);
      INSERT INTO credit_purchases VALUES (70, 7);
      INSERT INTO credit_installments VALUES (1, 70, 2026, 11, 150, 0);
      INSERT INTO entry_occurrences VALUES (90, 41, 2026, 11, 150, 0, 0, CURRENT_TIMESTAMP);
      INSERT INTO entry_amounts VALUES (80, 41, 2026, 11, 150, CURRENT_TIMESTAMP);
      INSERT INTO bank_amounts VALUES (1, 3, 9, 100, CURRENT_TIMESTAMP);
    `);

    const result = resolveEntryOccurrence(db, {
      groupId: 3, userId: 9, entryId: 41, year: 2026, month: 11, occurrenceId: 90,
    });
    expect(result).toMatchObject({ bankAmount: -50, operationType: "subtract", appliedAmount: 150 });
    expect(db.prepare("SELECT amount, is_resolved FROM entry_occurrences WHERE id = 90").get()).toEqual({ amount: 0, is_resolved: 1 });
    expect(db.prepare("SELECT amount FROM entry_amounts WHERE id = 80").get().amount).toBe(0);
    expect(db.prepare("SELECT is_paid FROM credit_installments WHERE id = 1").get().is_paid).toBe(1);
    expect(db.prepare("SELECT delta FROM balance_history").get().delta).toBe(-150);
    db.close();
  });

  test("consecutive same-second transactions read the latest balance by row order", () => {
    const db = createResolutionDb();
    db.exec(`
      INSERT INTO entries VALUES (41, 3, 'expense', 'Travel card', 1);
      INSERT INTO credit_cards VALUES (7, 3, 41);
      INSERT INTO credit_purchases VALUES (70, 7);
      INSERT INTO credit_installments VALUES (1, 70, 2026, 11, 150, 0);
      INSERT INTO entry_occurrences VALUES (90, 41, 2026, 11, 150, 0, 0, CURRENT_TIMESTAMP);
      INSERT INTO bank_amounts VALUES (1, 3, 9, 100, CURRENT_TIMESTAMP);
    `);
    const first = resolveEntryOccurrence(db, {
      groupId: 3, userId: 9, entryId: 41, year: 2026, month: 11, occurrenceId: 90,
    });
    expect(first.bankAmount).toBe(-50);
    db.prepare("INSERT INTO entries VALUES (42, 3, 'expense', 'Utility bill', 0)").run();
    db.prepare("INSERT INTO entry_occurrences VALUES (91, 42, 2026, 11, 20, 0, 0, CURRENT_TIMESTAMP)").run();
    db.prepare("INSERT INTO entry_amounts VALUES (81, 42, 2026, 11, 20, CURRENT_TIMESTAMP)").run();
    const second = resolveEntryOccurrence(db, {
      groupId: 3, userId: 9, entryId: 42, year: 2026, month: 11, occurrenceId: 91,
    });
    expect(second.bankAmount).toBe(-70);
    expect(db.prepare("SELECT amount FROM bank_amounts WHERE group_id = 3 ORDER BY id DESC LIMIT 1").get().amount).toBe(-70);
    db.close();
  });

  test("retries cannot apply an occurrence twice", () => {
    const db = createResolutionDb();
    db.exec(`
      INSERT INTO entries VALUES (41, 3, 'expense', 'Rent', 0);
      INSERT INTO entry_occurrences VALUES (90, 41, 2026, 11, 75, 0, 0, CURRENT_TIMESTAMP);
      INSERT INTO entry_amounts VALUES (80, 41, 2026, 11, 75, CURRENT_TIMESTAMP);
      INSERT INTO bank_amounts VALUES (1, 3, 9, 200, CURRENT_TIMESTAMP);
    `);
    const input = { groupId: 3, userId: 9, entryId: 41, year: 2026, month: 11, occurrenceId: 90 };
    expect(resolveEntryOccurrence(db, input).bankAmount).toBe(125);
    expect(resolveEntryOccurrence(db, input)).toMatchObject({ alreadyResolved: true, bankAmount: 125 });
    expect(db.prepare("SELECT COUNT(*) AS count FROM balance_history").get().count).toBe(1);
    db.close();
  });
});

import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { calculateAvailableCredit, getCreditCardCreditSummary, getDefaultCreditPurchaseStart, getInstallmentMonths, reopenCardBillForInstallment, replaceUnpaidCreditInstallments, syncCreditCardBills } from "./credit-cards.js";

function createCreditDatabase() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE entries (id INTEGER PRIMARY KEY, group_id INTEGER, name TEXT);
    CREATE TABLE credit_cards (id INTEGER PRIMARY KEY, group_id INTEGER, entry_id INTEGER, credit_limit REAL DEFAULT 0);
    CREATE TABLE credit_purchases (id INTEGER PRIMARY KEY, card_id INTEGER, description TEXT, purchase_amount REAL DEFAULT 0, installment_amount REAL DEFAULT 0, installment_count INTEGER DEFAULT 1, start_year INTEGER DEFAULT 2026, start_month INTEGER DEFAULT 1, cancelled_at TEXT);
    CREATE TABLE credit_installments (id INTEGER PRIMARY KEY, purchase_id INTEGER, year INTEGER, month INTEGER, amount REAL, is_paid INTEGER DEFAULT 0);
    CREATE TABLE entry_occurrences (id INTEGER PRIMARY KEY, entry_id INTEGER, year INTEGER, month INTEGER, amount REAL, is_resolved INTEGER DEFAULT 0, is_dismissed INTEGER DEFAULT 0, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(entry_id, year, month));
    CREATE TABLE entry_amounts (id INTEGER PRIMARY KEY, entry_id INTEGER, month INTEGER, year INTEGER, amount REAL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(entry_id, month, year));
    INSERT INTO entries VALUES (41, 3, 'Travel card');
     INSERT INTO credit_cards VALUES (7, 3, 41, 500);
  `);
  return db;
}

describe("credit card installment schedules", () => {
  test("creates schedules across year boundaries", () => {
    expect(getInstallmentMonths(2026, 11, 4)).toEqual([
      { year: 2026, month: 11 },
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
      { year: 2027, month: 2 },
    ]);
  });

  test("ordinary purchases default to next month's bill and installments default two months out", () => {
    const december = new Date(2026, 11, 18);
    expect(getDefaultCreditPurchaseStart(false, december)).toEqual({ year: 2027, month: 1 });
    expect(getDefaultCreditPurchaseStart(true, december)).toEqual({ year: 2027, month: 2 });
    expect(getDefaultCreditPurchaseStart(false, new Date(2026, 5, 1))).toEqual({ year: 2026, month: 7 });
  });

  test("available limit subtracts all unpaid installments and releases paid or cancelled ones", () => {
    expect(calculateAvailableCredit(1000, [100, 100, 50])).toBe(750);
    expect(calculateAvailableCredit(1000, [100, 50])).toBe(850);
    expect(calculateAvailableCredit(1000, [])).toBe(1000);
    expect(calculateAvailableCredit(100, [150])).toBe(-50);
  });

  test("credit summary counts installments outside the forecast, releases payments, excludes cancelled purchases", () => {
    const db = createCreditDatabase();
    db.exec(`
      UPDATE credit_cards SET credit_limit = 1000 WHERE id = 7;
      INSERT INTO credit_purchases (id, card_id, description) VALUES (40, 7, 'Appliance');
      INSERT INTO credit_installments VALUES (1, 40, 2029, 2, 200, 0);
      INSERT INTO credit_installments VALUES (2, 40, 2029, 3, 200, 1);
      INSERT INTO credit_purchases (id, card_id, description, cancelled_at) VALUES (41, 7, 'Cancelled', '2026-01-01');
      INSERT INTO credit_installments VALUES (3, 41, 2029, 4, 150, 0);
    `);

    expect(getCreditCardCreditSummary(db, 7)).toEqual({
      creditLimit: 1000,
      outstandingCredit: 200,
      availableCredit: 800,
    });
    db.prepare("UPDATE credit_installments SET is_paid = 1 WHERE id = 1").run();
    expect(getCreditCardCreditSummary(db, 7)).toEqual({
      creditLimit: 1000,
      outstandingCredit: 0,
      availableCredit: 1000,
    });
    db.close();
  });

  test("aggregates purchases into one bill per month and preserves settled bills", () => {
    const db = createCreditDatabase();
    db.exec(`
      INSERT INTO credit_purchases (id, card_id, description) VALUES (1, 7, 'Laptop');
      INSERT INTO credit_purchases (id, card_id, description) VALUES (2, 7, 'Bag');
      INSERT INTO credit_installments VALUES (1, 1, 2026, 12, 100, 0);
      INSERT INTO credit_installments VALUES (2, 1, 2027, 1, 100, 0);
      INSERT INTO credit_installments VALUES (3, 2, 2026, 12, 30, 0);
      INSERT INTO entry_occurrences (entry_id, year, month, amount, is_resolved)
        VALUES (41, 2026, 11, 55, 1);
    `);

    syncCreditCardBills(db, 3);
    expect(db.prepare("SELECT amount, is_resolved FROM entry_occurrences WHERE entry_id = 41 AND year = 2026 AND month = 12").get()).toEqual({ amount: 130, is_resolved: 0 });
    expect(db.prepare("SELECT amount FROM entry_occurrences WHERE entry_id = 41 AND year = 2027 AND month = 1").get().amount).toBe(100);
    expect(db.prepare("SELECT amount, is_resolved FROM entry_occurrences WHERE entry_id = 41 AND year = 2026 AND month = 11").get()).toEqual({ amount: 55, is_resolved: 1 });

    db.prepare("UPDATE credit_installments SET is_paid = 1 WHERE year = 2026 AND month = 12").run();
    syncCreditCardBills(db, 3);
    expect(db.prepare("SELECT amount FROM entry_occurrences WHERE entry_id = 41 AND year = 2026 AND month = 12").get().amount).toBe(0);
    db.close();
  });

  test("adding an installment to a settled month reopens the new bill without charging the old one twice", () => {
    const db = createCreditDatabase();
    db.exec(`
      INSERT INTO credit_purchases (id, card_id, description) VALUES (10, 7, 'Camera');
      INSERT INTO credit_installments VALUES (1, 10, 2026, 11, 80, 1);
      INSERT INTO entry_occurrences (entry_id, year, month, amount, is_resolved)
        VALUES (41, 2026, 11, 0, 1);
    `);
    const before = db.prepare("SELECT amount, is_resolved FROM entry_occurrences WHERE entry_id = 41 AND year = 2026 AND month = 11").get();
    expect(before).toEqual({ amount: 0, is_resolved: 1 });

    db.transaction(() => {
      db.prepare("INSERT INTO credit_installments (purchase_id, year, month, amount, is_paid) VALUES (10, 2026, 11, 25, 0)").run();
      reopenCardBillForInstallment(db, 41, 2026, 11);
      syncCreditCardBills(db, 3);
    })();

    expect(db.prepare("SELECT amount, is_resolved FROM entry_occurrences WHERE entry_id = 41 AND year = 2026 AND month = 11").get()).toEqual({ amount: 25, is_resolved: 0 });
    db.close();
  });

  test("purchase edits keep paid installments, replace unpaid installments, and recompute bill totals", () => {
    const db = createCreditDatabase();
    db.exec(`
      INSERT INTO credit_purchases (id, card_id, description) VALUES (20, 7, 'Phone');
      INSERT INTO credit_installments VALUES (1, 20, 2026, 10, 40, 1);
      INSERT INTO credit_installments VALUES (2, 20, 2026, 11, 40, 0);
      INSERT INTO entry_occurrences (entry_id, year, month, amount, is_resolved)
        VALUES (41, 2026, 10, 0, 1);
      INSERT INTO entry_occurrences (entry_id, year, month, amount, is_resolved)
        VALUES (41, 2026, 11, 40, 0);
    `);

    db.transaction(() => replaceUnpaidCreditInstallments(db, {
      purchaseId: 20,
      entryId: 41,
      schedule: [{ year: 2026, month: 11 }, { year: 2026, month: 12 }, { year: 2027, month: 1 }],
      amount: 55,
      count: 4,
    }))();
    syncCreditCardBills(db, 3);

    expect(db.prepare("SELECT year, month, amount, is_paid FROM credit_installments WHERE purchase_id = 20 ORDER BY year, month").all()).toEqual([
      { year: 2026, month: 10, amount: 40, is_paid: 1 },
      { year: 2026, month: 11, amount: 55, is_paid: 0 },
      { year: 2026, month: 12, amount: 55, is_paid: 0 },
      { year: 2027, month: 1, amount: 55, is_paid: 0 },
    ]);
    expect(db.prepare("SELECT amount FROM entry_occurrences WHERE entry_id = 41 AND year = 2026 AND month = 11").get().amount).toBe(55);
    expect(db.prepare("SELECT amount FROM entry_occurrences WHERE entry_id = 41 AND year = 2027 AND month = 1").get().amount).toBe(55);
    db.close();
  });

  test("a resolved occurrence stays hidden from forecast after sync", () => {
    const db = createCreditDatabase();
    db.exec(`
      INSERT INTO credit_purchases (id, card_id, description) VALUES (30, 7, 'Desk');
      INSERT INTO credit_installments VALUES (1, 30, 2026, 11, 200, 1);
      INSERT INTO entry_occurrences (entry_id, year, month, amount, is_resolved)
        VALUES (41, 2026, 11, 0, 1);
      INSERT INTO entry_amounts (entry_id, year, month, amount) VALUES (41, 11, 2026, 0);
    `);
    syncCreditCardBills(db, 3);
    expect(db.prepare("SELECT amount, is_resolved FROM entry_occurrences WHERE entry_id = 41 AND year = 2026 AND month = 11").get()).toEqual({ amount: 0, is_resolved: 1 });
    expect(db.prepare("SELECT amount FROM entry_amounts WHERE entry_id = 41 AND year = 2026 AND month = 11").get().amount).toBe(0);
    db.close();
  });

  test("bill sync does not recreate a hidden schedule for a settled occurrence", () => {
    const db = createCreditDatabase();
    db.exec(`
      INSERT INTO credit_purchases (id, card_id, description) VALUES (31, 7, 'Monitor');
      INSERT INTO credit_installments VALUES (1, 31, 2026, 11, 350, 1);
      INSERT INTO entry_occurrences (entry_id, year, month, amount, is_resolved)
        VALUES (41, 2026, 11, 0, 1);
      INSERT INTO entry_amounts (entry_id, month, year, amount) VALUES (41, 11, 2026, 0);
    `);
    syncCreditCardBills(db, 3);
    syncCreditCardBills(db, 3);
    expect(db.prepare("SELECT amount, is_resolved FROM entry_occurrences WHERE entry_id = 41 AND year = 2026 AND month = 11").get()).toEqual({ amount: 0, is_resolved: 1 });
    expect(db.prepare("SELECT amount FROM entry_amounts WHERE entry_id = 41 AND year = 2026 AND month = 11").get().amount).toBe(0);
    db.close();
  });
});

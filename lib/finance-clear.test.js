import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { clearFinanceGroupData } from "./finance-clear.js";

describe("clear finance group data", () => {
  test("clears core finance data for the selected group only", () => {
    const db = new Database(":memory:");
    db.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE groups (id INTEGER PRIMARY KEY);
      CREATE TABLE entries (id INTEGER PRIMARY KEY, group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE);
      CREATE TABLE entry_amounts (id INTEGER PRIMARY KEY, entry_id INTEGER REFERENCES entries(id) ON DELETE CASCADE);
      CREATE TABLE entry_occurrences (id INTEGER PRIMARY KEY, entry_id INTEGER REFERENCES entries(id) ON DELETE CASCADE);
      CREATE TABLE bank_amounts (id INTEGER PRIMARY KEY, group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE);
      CREATE TABLE balance_history (id INTEGER PRIMARY KEY, group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE);
      INSERT INTO groups (id) VALUES (1), (2);
      INSERT INTO entries (id, group_id) VALUES (11, 1), (22, 2);
      INSERT INTO entry_amounts (id, entry_id) VALUES (111, 11), (222, 22);
      INSERT INTO entry_occurrences (id, entry_id) VALUES (1111, 11), (2222, 22);
      INSERT INTO bank_amounts (id, group_id) VALUES (11111, 1), (22222, 2);
      INSERT INTO balance_history (id, group_id) VALUES (111111, 1), (222222, 2);
    `);

    expect(clearFinanceGroupData(db, 1)).toEqual({
      entries: 1,
      bankRecords: 1,
      historyRecords: 1,
    });
    expect(db.prepare("SELECT id FROM entries").all()).toEqual([{ id: 22 }]);
    expect(db.prepare("SELECT id FROM entry_amounts").all()).toEqual([{ id: 222 }]);
    expect(db.prepare("SELECT id FROM entry_occurrences").all()).toEqual([{ id: 2222 }]);
    expect(db.prepare("SELECT id FROM bank_amounts").all()).toEqual([{ id: 22222 }]);
    expect(db.prepare("SELECT id FROM balance_history").all()).toEqual([{ id: 222222 }]);
    db.close();
  });
});

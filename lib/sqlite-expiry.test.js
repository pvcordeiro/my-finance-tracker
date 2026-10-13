import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";

test("ISO expiry comparisons respect the precise UTC timestamp", () => {
  const db = new Database(":memory:");
  db.exec("CREATE TABLE tokens (expires_at TEXT NOT NULL)");
  db.prepare("INSERT INTO tokens (expires_at) VALUES (?)").run(
    "2026-10-13T01:00:00.000Z"
  );

  const validAtEndOfDay = db
    .prepare(
      "SELECT COUNT(*) AS count FROM tokens WHERE expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', '2026-10-13 23:00:00')"
    )
    .get();

  expect(validAtEndOfDay.count).toBe(0);
  db.close();
});

import { describe, expect, test } from "bun:test";
import { applyOccurrenceToBalance, backfillLegacyRollingAmounts, findNextUnresolvedAmount, getNextUnresolvedOccurrence, projectOccurrenceAmount, resolveRollingOccurrence } from "./rolling-months.js";

describe("legacy rolling amount mapping", () => {
  test("maps legacy calendar-month amounts into the rolling window across year end", () => {
    const months = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(2026, 9 + index, 1);
      return { year: date.getFullYear(), month: date.getMonth() + 1 };
    });
    const legacyAmounts = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      amount: (index + 1) * 100,
    }));

    const result = backfillLegacyRollingAmounts(
      Array(12).fill(0),
      Array(12).fill(false),
      legacyAmounts,
      months
    );

    expect(result).toEqual([1000, 1100, 1200, 100, 200, 300, 400, 500, 600, 700, 800, 900]);
  });

  test("keeps exact year-specific values and never overwrites a resolved slot", () => {
    const slots = [
      { year: 2026, month: 10 },
      { year: 2026, month: 11 },
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
    ];
    const result = backfillLegacyRollingAmounts(
      [750, 0, 0, 0],
      [true, false, false, false],
      [
        { month: 10, amount: 1000 },
        { month: 11, amount: 1100 },
        { month: 12, amount: 1200 },
        { month: 1, amount: 100 },
      ],
      slots
    );

    expect(result).toEqual([750, 1100, 1200, 100]);
  });

  test("preserves explicit zero amounts in legacy data", () => {
    const result = backfillLegacyRollingAmounts(
      [9, 9],
      [false, false],
      [{ month: 1, amount: 0 }, { month: 2, amount: 25 }],
      [{ year: 2027, month: 1 }, { year: 2027, month: 2 }]
    );

    expect(result).toEqual([0, 25]);
  });

  test("chooses the next non-zero unresolved, non-dismissed rolling month", () => {
    expect(findNextUnresolvedAmount([12, 24, 36, 48], [true, false, false, false], [false, true, false, false])).toBe(2);
  });

  test("targets the matching calendar year/month when the next value crosses January", () => {
    const entry = {
      amounts: [0, 0, 0, 85, 0],
      resolved: [false, false, false, false, false],
      dismissed: [false, false, false, false, false],
      occurrenceIds: [null, null, null, 27, null],
    };
    expect(getNextUnresolvedOccurrence(entry, new Date(2026, 9, 12))).toEqual({
      monthIndex: 3,
      year: 2027,
      month: 1,
      amount: 85,
      occurrenceId: 27,
    });
  });

  test("resolution zeros only the exact recurrent occurrence and preserves later months", () => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    const entry = { amounts: [10, 20, 30, 40], recurrent: true, resolved: [false, false, false, false] };
    const resolved = resolveRollingOccurrence(entry, 2, target.getFullYear(), target.getMonth() + 1);
    expect(resolved.amounts).toEqual([10, 20, 0, 40]);
    expect(resolved.resolved).toEqual([false, false, true, false]);
    expect(entry.amounts).toEqual([10, 20, 30, 40]);
  });

  test("already resolved values are absent from the resolved month's active view", () => {
    const months = [
      { year: 2026, month: 10 },
      { year: 2026, month: 11 },
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
    ];
    const amounts = backfillLegacyRollingAmounts(
      [80, 0, 0, 0],
      [true, false, false, false],
      [{ month: 10, amount: 80 }, { month: 11, amount: 90 }, { month: 12, amount: 100 }, { month: 1, amount: 110 }],
      months
    );
    expect(amounts).toEqual([80, 90, 100, 110]);
    expect(projectOccurrenceAmount(amounts[0], true, false)).toBe(0);
  });

  test("settling income adds to balance and settling expense subtracts without going negative", () => {
    expect(applyOccurrenceToBalance(100, "income", 35)).toEqual({ nextBalance: 135, appliedDelta: 35 });
    expect(applyOccurrenceToBalance(100, "expense", 35)).toEqual({ nextBalance: 65, appliedDelta: -35 });
    expect(applyOccurrenceToBalance(20, "expense", 35)).toEqual({ nextBalance: 0, appliedDelta: -20 });
  });
});

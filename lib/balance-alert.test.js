import { describe, expect, test } from "bun:test";
import { getProjectedBalanceAlert } from "./balance-alert.js";

const months = [
  { label: "October", year: 2026, balance: 320 },
  { label: "November", year: 2026, balance: -80 },
  { label: "December", year: 2026, balance: 120 },
];

describe("projected balance alerts", () => {
  test("keeps the first below-threshold month while surfacing a later negative month", () => {
    expect(getProjectedBalanceAlert(months, 500)).toEqual({
      type: "below-minimum",
      month: months[0],
      firstNegative: months[1],
    });
  });

  test("uses the red negative alert when the first breach is already negative", () => {
    expect(getProjectedBalanceAlert(months, 0)).toEqual({
      type: "negative",
      month: months[1],
      firstNegative: months[1],
    });
  });

  test("does not create an alert when every projected balance meets the buffer", () => {
    expect(
      getProjectedBalanceAlert(
        months.map((month) => ({ ...month, balance: month.balance + 600 })),
        500
      )
    ).toBeNull();
  });
});

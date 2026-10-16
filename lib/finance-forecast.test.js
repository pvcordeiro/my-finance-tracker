import { describe, expect, test } from "bun:test";
import { buildMonthlyForecast } from "./finance-forecast.js";

describe("monthly forecast", () => {
  test("keeps historical planned amounts out of the current actual balance", () => {
    const result = buildMonthlyForecast([
      { year: 2026, calendarMonth: 8, monthIndex: 0, income: 3000, expenses: 1000 },
      { year: 2026, calendarMonth: 9, monthIndex: 1, income: 2000, expenses: 2500 },
      { year: 2026, calendarMonth: 10, monthIndex: 2, income: 4000, expenses: 1500 },
      { year: 2026, calendarMonth: 11, monthIndex: 3, income: 1000, expenses: 1200 },
    ], 500, 2026, 10);

    expect(result.map((month) => month.balance)).toEqual([null, null, 3000, 2800]);
    expect(result.map((month) => month.isForecast)).toEqual([false, false, true, true]);
  });

  test("supports forecasts crossing the calendar year", () => {
    const result = buildMonthlyForecast([
      { year: 2026, calendarMonth: 12, monthIndex: 0, income: 1000, expenses: 200 },
      { year: 2027, calendarMonth: 1, monthIndex: 1, income: 0, expenses: 300 },
    ], 2000, 2026, 12);
    expect(result.map((month) => month.balance)).toEqual([2800, 2500]);
  });
});

import type { FinanceData } from "@/hooks/use-finance-data";

const amounts = (value: number, offsets: Record<number, number> = {}) =>
  Array.from({ length: 12 }, (_, index) => offsets[index] ?? value);

const resolved = Array.from({ length: 12 }, () => false);
const dismissed = Array.from({ length: 12 }, () => false);

const now = new Date();
const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

/** A read-only, consistent finance dataset shown only while the guided tour is active. */
export const guidedTourFinanceData: FinanceData = {
  bankAmount: 1800,
  incomes: [
    {
      id: "tour-income-salary",
      description: "Monthly salary",
      amounts: amounts(3200),
      recurrent: true,
      recurrenceAmount: 3200,
      resolved,
      dismissed,
    },
    {
      id: "tour-income-freelance",
      description: "Freelance project",
      amounts: amounts(0, { 1: 450, 4: 700, 8: 520 }),
      recurrent: false,
      recurrenceAmount: 0,
      resolved,
      dismissed,
    },
  ],
  expenses: [
    {
      id: "tour-expense-rent",
      description: "Rent",
      amounts: amounts(1150),
      recurrent: true,
      recurrenceAmount: 1150,
      resolved,
      dismissed,
    },
    {
      id: "tour-expense-utilities",
      description: "Utilities",
      amounts: amounts(165, { 2: 210, 7: 190 }),
      recurrent: true,
      recurrenceAmount: 165,
      resolved,
      dismissed,
    },
    {
      id: "tour-expense-groceries",
      description: "Groceries",
      amounts: amounts(340, { 3: 390, 6: 315, 10: 365 }),
      recurrent: false,
      recurrenceAmount: 0,
      resolved,
      dismissed,
    },
  ],
  pending: [
    {
      entryId: "tour-pending-utility",
      description: "Electricity bill",
      type: "expense",
      year: previousMonthDate.getFullYear(),
      month: previousMonthDate.getMonth() + 1,
      amount: 74.5,
      isIncome: false,
    },
    {
      entryId: "tour-pending-invoice",
      description: "Client invoice",
      type: "income",
      year: previousMonthDate.getFullYear(),
      month: previousMonthDate.getMonth() + 1,
      amount: 420,
      isIncome: true,
    },
  ],
};

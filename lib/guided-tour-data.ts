import type { FinanceData } from "@/hooks/use-finance-data";

const amounts = (value: number, offsets: Record<number, number> = {}) =>
  Array.from({ length: 12 }, (_, index) => offsets[index] ?? value);

const resolved = Array.from({ length: 12 }, () => false);
const dismissed = Array.from({ length: 12 }, () => false);
const now = new Date();
const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const rollingSlots = Array.from({ length: 12 }, (_, index) => {
  const date = new Date(now.getFullYear(), now.getMonth() + index, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
});

const installmentSchedule = Array.from({ length: 6 }, (_, index) => {
  const date = new Date(now.getFullYear(), now.getMonth() + 2 + index, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
});
const oneTimeBillDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

const guidedPurchases = [
  {
    id: "tour-credit-purchase-installments",
    description: "Wireless headphones",
    purchaseAmount: 240,
    installmentAmount: 40,
    installmentCount: 6,
    startYear: installmentSchedule[0].year,
    startMonth: installmentSchedule[0].month,
    cancelled: false,
    hasPaidInstallments: false,
    installments: installmentSchedule.map((slot) => ({
      ...slot,
      amount: 40,
      resolved: false,
      dismissed: false,
      inForecast: true,
    })),
  },
  {
    id: "tour-credit-purchase-one-time",
    description: "Grocery shop",
    purchaseAmount: 85,
    installmentAmount: 85,
    installmentCount: 1,
    startYear: oneTimeBillDate.getFullYear(),
    startMonth: oneTimeBillDate.getMonth() + 1,
    cancelled: false,
    hasPaidInstallments: false,
    installments: [{
      year: oneTimeBillDate.getFullYear(),
      month: oneTimeBillDate.getMonth() + 1,
      amount: 85,
      resolved: false,
      dismissed: false,
      inForecast: true,
    }],
  },
];

const creditExpenses = rollingSlots.map((slot) => guidedPurchases.reduce(
  (total, purchase) => total + purchase.installments
    .filter((installment) => installment.year === slot.year && installment.month === slot.month)
    .reduce((sum, installment) => sum + installment.amount, 0),
  0
));

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
    {
      id: "tour-credit-entry",
      description: "Everyday card",
      amounts: creditExpenses,
      resolved,
      dismissed,
      isCreditCard: true,
      cardId: "tour-credit-card",
      occurrenceIds: Array.from({ length: 12 }, (_, index) => 900 + index),
    },
  ],
  creditCards: [{
    id: "tour-credit-card",
    name: "Everyday card",
    entryId: "tour-credit-entry",
    creditLimit: 2500,
    outstandingCredit: guidedPurchases.reduce((total, purchase) => total + purchase.installments.reduce((sum, installment) => sum + installment.amount, 0), 0),
    availableCredit: 2500 - guidedPurchases.reduce((total, purchase) => total + purchase.installments.reduce((sum, installment) => sum + installment.amount, 0), 0),
    purchases: guidedPurchases,
  }],
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

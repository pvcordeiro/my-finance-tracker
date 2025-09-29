export interface FinanceEntry {
  id: string;
  description: string;
  amounts: number[];
}

export interface FinanceDataShape {
  bankAmount: number;
  incomes: FinanceEntry[];
  expenses: FinanceEntry[];
}

export type CommitResult =
  | { success: true }
  | { success: false; conflict?: true; error?: string };

export type FinanceImportUnknown = unknown;

export type FinanceImportData = FinanceDataShape;

export function isFinanceImportData(data: unknown): data is FinanceImportData {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.bankAmount !== "number") return false;
  if (!Array.isArray(obj.incomes) || !Array.isArray(obj.expenses)) return false;

  const validEntry = (entry: unknown) => {
    if (typeof entry !== "object" || entry === null) return false;
    const e = entry as Record<string, unknown>;
    return (
      typeof e.id === "string" &&
      typeof e.description === "string" &&
      Array.isArray(e.amounts) &&
      e.amounts.length === 12 &&
      e.amounts.every((a: unknown) => typeof a === "number")
    );
  };

  return obj.incomes.every(validEntry) && obj.expenses.every(validEntry);
}

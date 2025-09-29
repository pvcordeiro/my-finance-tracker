// Central domain types to remove scattered `any` usage.
// If you already have overlapping definitions (e.g., FinanceEntry in entry-form),
// consider consolidating later; for now we re-export a compatible shape.

export interface FinanceEntry {
  id: string;
  description: string;
  amounts: number[]; // length 12
}

export interface FinanceDataShape {
  bankAmount: number;
  incomes: FinanceEntry[];
  expenses: FinanceEntry[];
}

// Result of committing a mutation to the server.
export type CommitResult =
  | { success: true }
  | { success: false; conflict?: true; error?: string };

// Shape expected when importing from a JSON file before validation.
export type FinanceImportUnknown = unknown;

// Narrowed valid import data (mirrors FinanceDataShape)
export type FinanceImportData = FinanceDataShape;

// Type guard to validate unknown JSON as FinanceImportData.
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

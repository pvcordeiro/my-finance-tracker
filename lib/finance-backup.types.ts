export interface FinanceBackupMonth {
  year: number;
  month: number;
  amount: number;
  resolved: boolean;
  dismissed: boolean;
}

export interface FinanceBackupEntry {
  name: string;
  type: "income" | "expense";
  recurrent: boolean;
  recurrenceAmount: number;
  months: FinanceBackupMonth[];
}

export interface FinanceBackup {
  version: 1;
  bankAmount: number;
  entries: FinanceBackupEntry[];
}

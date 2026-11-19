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
  creditCards?: FinanceBackupCard[];
}

export interface FinanceBackupCard {
  name: string;
  creditLimit?: number;
  bills?: Array<{ year: number; month: number; resolved: boolean; dismissed: boolean }>;
  purchases: Array<{
    backupKey: string;
    description: string;
    purchaseAmount: number;
    installmentAmount: number;
    installmentCount: number;
    startYear: number;
    startMonth: number;
    cancelled: boolean;
    installments: Array<{ year: number; month: number; amount: number; paid: boolean }>;
  }>;
}

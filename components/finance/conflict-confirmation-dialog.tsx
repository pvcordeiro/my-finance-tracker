"use client";

import { FinanceData } from "@/hooks/use-finance-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

interface ConflictConfirmationDialogProps {
  isOpen: boolean;
  conflictingData: FinanceData | null;
  currentData: FinanceData;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  conflictType?: "bank" | "entries" | "all" | null;
}

export function ConflictConfirmationDialog({
  isOpen,
  conflictingData,
  currentData,
  onConfirm,
  onCancel,
  conflictType,
}: ConflictConfirmationDialogProps) {
  const { t } = useLanguage();

  if (!conflictingData) return null;

  const getConflictingFields = () => {
    const conflicts: string[] = [];

    if (conflictingData.bankAmount !== currentData.bankAmount) {
      conflicts.push(
        `Bank Amount: Current ${conflictingData.bankAmount}, Your change: ${currentData.bankAmount}`
      );
    }

    currentData.incomes.forEach((income) => {
      const serverIncome = conflictingData.incomes.find(
        (i) => i.id === income.id
      );
      if (serverIncome) {
        if (serverIncome.description !== income.description) {
          conflicts.push(
            `Income "${serverIncome.description}": Current "${serverIncome.description}", Your change: "${income.description}"`
          );
        }
        for (let month = 0; month < 12; month++) {
          if (serverIncome.amounts[month] !== income.amounts[month]) {
            const monthNames = [
              "Jan","Feb","Mar","Apr","May","Jun",
              "Jul","Aug","Sep","Oct","Nov","Dec",
            ];
            conflicts.push(
              `Income "${serverIncome.description}" ${monthNames[month]}: Current ${serverIncome.amounts[month]}, Your change: ${income.amounts[month]}`
            );
          }
        }
      }
    });

    currentData.expenses.forEach((expense) => {
      const serverExpense = conflictingData.expenses.find(
        (e) => e.id === expense.id
      );
      if (serverExpense) {
        if (serverExpense.description !== expense.description) {
          conflicts.push(
            `Expense "${serverExpense.description}": Current "${serverExpense.description}", Your change: "${expense.description}"`
          );
        }
        for (let month = 0; month < 12; month++) {
          if (serverExpense.amounts[month] !== expense.amounts[month]) {
            const monthNames = [
              "Jan","Feb","Mar","Apr","May","Jun",
              "Jul","Aug","Sep","Oct","Nov","Dec",
            ];
            conflicts.push(
              `Expense "${serverExpense.description}" ${monthNames[month]}: Current ${serverExpense.amounts[month]}, Your change: ${expense.amounts[month]}`
            );
          }
        }
      }
    });

    return conflicts;
  };

  const conflicts = getConflictingFields();

  const dialogTitle =
    conflictType === "bank"
      ? t("entries.conflictBankTitle")
      : conflictType === "entries"
      ? t("entries.conflictEntriesTitle")
      : t("entries.conflictAllTitle");

  const introText =
    conflictType === "bank"
      ? t("entries.conflictBankIntro")
      : conflictType === "entries"
      ? t("entries.conflictEntriesIntro")
      : t("entries.conflictAllIntro");

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="mb-4">
            {introText} {t("entries.conflictFollowing")}
          </p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {conflicts.map((conflict) => (
              <div
                key={conflict}
                className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-900 dark:text-amber-100 font-medium"
              >
                {conflict}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {t("entries.conflictOverwriteQuestion")}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t("entries.overwriteChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

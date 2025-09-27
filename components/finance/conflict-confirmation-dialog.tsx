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
  if (!conflictingData) return null;

  const getConflictingFields = () => {
    const conflicts: string[] = [];

    if (conflictingData.bankAmount !== currentData.bankAmount) {
      conflicts.push(
        `Bank Amount: Current ${conflictingData.bankAmount}, Your change: ${currentData.bankAmount}`
      );
    }

    // Check incomes
    currentData.incomes.forEach((income, index) => {
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
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ];
            conflicts.push(
              `Income "${serverIncome.description}" ${monthNames[month]}: Current ${serverIncome.amounts[month]}, Your change: ${income.amounts[month]}`
            );
          }
        }
      }
    });

    // Check expenses
    currentData.expenses.forEach((expense, index) => {
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
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
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

  const titleMap: Record<string, string> = {
    bank: "Bank Amount Conflict",
    entries: "Entries Conflict",
    all: "Data Conflict Detected",
  };
  const dialogTitle = conflictType
    ? titleMap[conflictType] || titleMap.all
    : "Data Conflict Detected";
  const introText =
    conflictType === "bank"
      ? "Another user has updated the bank amount since you last loaded it."
      : conflictType === "entries"
      ? "Another user has updated one or more entries since you last loaded them."
      : "Another user has modified the data since you last loaded it.";

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="mb-4">
            {introText} The following changes conflict with your modifications:
          </p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {conflicts.map((conflict, index) => (
              <div
                key={index}
                className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-black font-bold"
              >
                {conflict}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Do you want to overwrite these changes with your modifications?
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Overwrite Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

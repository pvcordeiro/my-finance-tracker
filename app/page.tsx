"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useFinanceData } from "@/hooks/use-finance-data";
import { DashboardHeader } from "@/components/finance/dashboard-header";
import { BankAmount } from "@/components/finance/bank-amount";
import { EntryForm } from "@/components/finance/entry-form";
import { Button } from "@/components/ui/button";
import { Save, BarChart3, FileText } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FullPageLoader } from "@/components/ui/loading";

function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const {
    data,
    hasChanges,
    saveData,
    updateBankAmount,
    addEntry,
    updateEntry,
    removeEntry,
  } = useFinanceData();
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const nextRouteRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasChanges]);

  // Custom navigation handler for in-app navigation
  const handleNav = (url: string) => {
    if (hasChanges) {
      setShowConfirm(true);
      nextRouteRef.current = url;
    } else {
      router.push(url);
    }
  };

  const confirmNavigation = useCallback(() => {
    setShowConfirm(false);
    if (nextRouteRef.current) {
      router.push(nextRouteRef.current);
      nextRouteRef.current = null;
    }
  }, [router]);

  const cancelNavigation = useCallback(() => {
    setShowConfirm(false);
    nextRouteRef.current = null;
  }, []);

  if (isLoading) {
    return <FullPageLoader message="Loading your financial data..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen finance-gradient">
      <DashboardHeader />
      <main className="container mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6 pb-24 sm:pb-6">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="transition-all duration-200 hover:scale-[1.01] active:scale-[0.95] touch-manipulation h-12 sm:h-10 px-4 sm:px-3"
            onClick={() => handleNav("/summary")}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            <span className="transition-all duration-200 hover:scale-[1.05]">
              Summary
            </span>
          </Button>
          <Button
            variant="outline"
            className="transition-all duration-200 hover:scale-[1.01] active:scale-[0.95] touch-manipulation h-12 sm:h-10 px-4 sm:px-3"
            onClick={() => handleNav("/details")}
          >
            <FileText className="w-4 h-4 mr-2" />
            <span className="transition-all duration-200 hover:scale-[1.05]">
              Details
            </span>
          </Button>
        </div>
        <BankAmount amount={data.bankAmount} onChange={updateBankAmount} />

        <div className="space-y-4">
          <EntryForm
            title="Income"
            entries={data.incomes}
            onAddEntry={() => addEntry("incomes")}
            onUpdateEntry={(id, field, value, monthIndex) =>
              updateEntry("incomes", id, field, value, monthIndex)
            }
            onRemoveEntry={(id) => removeEntry("incomes", id)}
            type="income"
            isOpen={incomeOpen}
            onToggle={() => setIncomeOpen(!incomeOpen)}
          />

          <EntryForm
            title="Expenses"
            entries={data.expenses}
            onAddEntry={() => addEntry("expenses")}
            onUpdateEntry={(id, field, value, monthIndex) =>
              updateEntry("expenses", id, field, value, monthIndex)
            }
            onRemoveEntry={(id) => removeEntry("expenses", id)}
            type="expense"
            isOpen={expenseOpen}
            onToggle={() => setExpenseOpen(!expenseOpen)}
          />
        </div>

        <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-40">
          {hasChanges && (
            <Button
              onClick={() => saveData()}
              className="shadow-lg transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] bg-emerald-600 hover:bg-emerald-700 touch-manipulation h-12 sm:h-10 px-4 sm:px-3"
            >
              <Save className="w-4 h-4 mr-2" />
              <span className="transition-all duration-200 hover:scale-[1.05]">
                Save
              </span>
            </Button>
          )}
        </div>
      </main>
      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            You have unsaved changes. Are you sure you want to leave this page?
            Your changes will be lost.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelNavigation}>
              Stay
            </Button>
            <Button variant="destructive" onClick={confirmNavigation}>
              Leave Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Page() {
  return <HomePage />;
}

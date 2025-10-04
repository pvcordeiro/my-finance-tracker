"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useFinanceData } from "@/hooks/use-finance-data";
import { DashboardHeader } from "@/components/finance/dashboard-header";
import { BankAmount } from "@/components/finance/bank-amount";
import { EntryForm } from "@/components/finance/entry-form";
import { Button } from "@/components/ui/button";
import { DataManagement } from "@/components/finance/data-management";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConflictConfirmationDialog } from "@/components/finance/conflict-confirmation-dialog";
import type { FinanceData, CommitResult } from "@/hooks/use-finance-data";

function HomePageContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    data,
    hasChanges,
    conflictData,
    conflictType,
    commitEntryDescription,
    commitEntryAmount,
    forceSaveData,
    cancelConflict,
    updateBankAmount,
    addEntry,
    updateEntry,
    removeEntry,
    setData,
    addToBankAmount,
    subtractFromBankAmount,
  } = useFinanceData();
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [incomeGuidedDialogOpen, setIncomeGuidedDialogOpen] = useState(false);
  const [expenseGuidedDialogOpen, setExpenseGuidedDialogOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const nextRouteRef = useRef<string | null>(null);
  const sessionExpiredRef = useRef(false);
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") === "management" ? "management" : "main"
  );
  const pendingGuidedEntryRef = useRef<{
    type: "incomes" | "expenses";
    description: string;
    amounts: number[];
  } | null>(null);
  const prevIncomeCountRef = useRef(data.incomes.length);
  const prevExpenseCountRef = useRef(data.expenses.length);
  const [guidedEntryFlash, setGuidedEntryFlash] = useState<{
    type: "incomes" | "expenses";
    entryId: string;
    token: number;
  } | null>(null);

  useEffect(() => {
    const tab = searchParams.get("tab");
    setActiveTab(tab === "management" ? "management" : "main");
  }, [searchParams]);

  useEffect(() => {
    const applyGuidedData = async () => {
      if (!pendingGuidedEntryRef.current) return;

      const { type, description, amounts } = pendingGuidedEntryRef.current;

      const currentCount =
        type === "incomes" ? data.incomes.length : data.expenses.length;
      const prevCount =
        type === "incomes"
          ? prevIncomeCountRef.current
          : prevExpenseCountRef.current;

      if (currentCount > prevCount) {
        const entries = type === "incomes" ? data.incomes : data.expenses;
        const newEntry = entries[entries.length - 1];

        if (newEntry && newEntry.description === "") {
          updateEntry(type, newEntry.id, "description", description);
          await commitEntryDescription(type, newEntry.id, description);

          for (let i = 0; i < 12; i++) {
            if (amounts[i] !== 0) {
              updateEntry(type, newEntry.id, "amount", amounts[i], i);
              await commitEntryAmount(type, newEntry.id, i, amounts[i]);
            }
          }

          flashCounterRef.current += 1;
          setLastSaved({
            kind: "entry-desc",
            id: newEntry.id,
            token: flashCounterRef.current,
          });

          setGuidedEntryFlash({
            type,
            entryId: newEntry.id,
            token: flashCounterRef.current,
          });

          toast.success(
            `${type === "incomes" ? "Income" : "Expense"} added successfully`,
            {
              description: description || "New entry created",
            }
          );

          pendingGuidedEntryRef.current = null;
        }
      }

      prevIncomeCountRef.current = data.incomes.length;
      prevExpenseCountRef.current = data.expenses.length;
    };

    applyGuidedData();
  }, [
    data.incomes.length,
    data.expenses.length,
    data.incomes,
    data.expenses,
    commitEntryAmount,
    commitEntryDescription,
    updateEntry,
  ]);

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

  const handleImportData = async (importedData: FinanceData) => {
    await setData(importedData, true);
  };

  const handleClearData = async () => {
    const emptyData = {
      bankAmount: 0,
      incomes: [],
      expenses: [],
    };
    await setData(emptyData, true);
  };

  const [lastSaved, setLastSaved] = useState<{
    kind: "bank" | "entry-desc" | "entry-amount";
    id?: string;
    monthIndex?: number;
    token: number;
    flashType?: "add" | "subtract";
  } | null>(null);
  const flashCounterRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastKnownBankAmountRef = useRef<number>(0);

  useEffect(() => {
    const eventSource = new EventSource("/api/bank-amount/stream", {
      withCredentials: true,
    });

    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("SSE connection established");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const serverAmount = data.amount;
        const operationType = data.operationType;

        if (
          serverAmount !== undefined &&
          serverAmount !== data.bankAmount &&
          serverAmount !== lastKnownBankAmountRef.current
        ) {
          lastKnownBankAmountRef.current = serverAmount;

          updateBankAmount(serverAmount);

          let flashType: "add" | "subtract";
          if (operationType === "add" || operationType === "subtract") {
            flashType = operationType;
          } else {
            flashType = serverAmount > data.bankAmount ? "add" : "subtract";
          }

          flashCounterRef.current += 1;
          setLastSaved({
            kind: "bank",
            token: flashCounterRef.current,
            flashType,
          });
        }
      } catch (error) {
        console.error("Error parsing SSE message:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [data.bankAmount, updateBankAmount]);

  const handleForceSave = async () => {
    try {
      const result = await forceSaveData(undefined, handleSessionExpired);
      if (result?.success) {
        flashCounterRef.current += 1;
        setLastSaved({ kind: "bank", token: flashCounterRef.current });
      }
    } catch (error) {
      console.error("Failed to force save data:", error);
    }
  };

  const handleSessionExpired = async () => {
    sessionExpiredRef.current = true;
    await logout();
    router.push("/login?session=expired");
  };

  const handleAddToBankAmount = async (delta: number) => {
    await addToBankAmount(delta);
    flashCounterRef.current += 1;
    setLastSaved({
      kind: "bank",
      token: flashCounterRef.current,
      flashType: "add",
    });
  };

  const handleSubtractFromBankAmount = async (delta: number) => {
    await subtractFromBankAmount(delta);
    flashCounterRef.current += 1;
    setLastSaved({
      kind: "bank",
      token: flashCounterRef.current,
      flashType: "subtract",
    });
  };

  const handleGuidedAddIncome = (description: string, amounts: number[]) => {
    pendingGuidedEntryRef.current = {
      type: "incomes",
      description,
      amounts,
    };

    addEntry("incomes");
  };

  const handleGuidedAddExpense = (description: string, amounts: number[]) => {
    pendingGuidedEntryRef.current = {
      type: "expenses",
      description,
      amounts,
    };

    addEntry("expenses");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen finance-gradient">
      <DashboardHeader />
      <main className="container mx-auto p-4 space-y-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsContent value="main">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Bank Amount */}
              <div className="lg:sticky lg:top-[155px] lg:self-start">
                <BankAmount
                  amount={data.bankAmount}
                  onAdd={handleAddToBankAmount}
                  onSubtract={handleSubtractFromBankAmount}
                  flashToken={
                    lastSaved?.kind === "bank" ? lastSaved.token : undefined
                  }
                  flashType={
                    lastSaved?.kind === "bank" ? lastSaved.flashType : undefined
                  }
                />
              </div>

              {/* Right Column - Add Buttons + Income and Expenses */}
              <div className="space-y-4">
                {/* Add Entry Buttons */}
                <div className="space-y-3 pt-3 border-t lg:border-t-0 lg:pt-0 lg:space-y-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      onClick={() => {
                        if (!incomeOpen) setIncomeOpen(true);
                        setIncomeGuidedDialogOpen(true);
                      }}
                      variant="outline"
                      className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] touch-manipulation py-4 sm:py-3 border-finance-positive/30 hover:bg-card"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Income
                    </Button>
                    <Button
                      onClick={() => {
                        if (!expenseOpen) setExpenseOpen(true);
                        setExpenseGuidedDialogOpen(true);
                      }}
                      variant="outline"
                      className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] touch-manipulation py-4 sm:py-3 border-finance-negative/30 hover:bg-card"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Expense
                    </Button>
                  </div>
                </div>

                <EntryForm
                  title="Income"
                  entries={data.incomes}
                  onAddEntry={() => addEntry("incomes")}
                  onGuidedAddEntry={handleGuidedAddIncome}
                  onUpdateEntry={(id, field, value, monthIndex) =>
                    updateEntry("incomes", id, field, value, monthIndex)
                  }
                  onRemoveEntry={async (id) => {
                    try {
                      const entry = data.incomes.find((e) => e.id === id);
                      const description = entry?.description || "Entry";

                      await removeEntry("incomes", id);
                      flashCounterRef.current += 1;
                      setLastSaved({
                        kind: "entry-desc",
                        id,
                        token: flashCounterRef.current,
                      });

                      toast.success("Income deleted", {
                        description: `${description} was removed successfully`,
                      });
                    } catch (error) {
                      console.error("Failed to delete income entry:", error);
                      toast.error("Failed to delete income", {
                        description: "Please try again",
                      });
                    }
                  }}
                  type="income"
                  isOpen={incomeOpen}
                  onToggle={() => setIncomeOpen(!incomeOpen)}
                  hideAddButton={true}
                  guidedDialogOpen={incomeGuidedDialogOpen}
                  onGuidedDialogOpenChange={setIncomeGuidedDialogOpen}
                  flashEntryId={
                    guidedEntryFlash?.type === "incomes"
                      ? guidedEntryFlash.entryId
                      : undefined
                  }
                  flashToken={
                    guidedEntryFlash?.type === "incomes"
                      ? guidedEntryFlash.token
                      : undefined
                  }
                  onCommitDescription={async (id, desc) => {
                    const res: CommitResult = await commitEntryDescription(
                      "incomes",
                      id,
                      desc
                    );
                    if (res.success === false && res.conflict) return false;
                    if (res.success) {
                      flashCounterRef.current += 1;
                      setLastSaved({
                        kind: "entry-desc",
                        id,
                        token: flashCounterRef.current,
                      });
                    }
                    return res.success;
                  }}
                  onCommitAmount={async (id, monthIndex, amount) => {
                    const res: CommitResult = await commitEntryAmount(
                      "incomes",
                      id,
                      monthIndex,
                      amount
                    );
                    if (res.success === false && res.conflict) return false;
                    if (res.success) {
                      flashCounterRef.current += 1;
                      setLastSaved({
                        kind: "entry-amount",
                        id,
                        monthIndex,
                        token: flashCounterRef.current,
                      });
                    }
                    return res.success;
                  }}
                />

                <EntryForm
                  title="Expenses"
                  entries={data.expenses}
                  onAddEntry={() => addEntry("expenses")}
                  onGuidedAddEntry={handleGuidedAddExpense}
                  onUpdateEntry={(id, field, value, monthIndex) =>
                    updateEntry("expenses", id, field, value, monthIndex)
                  }
                  onRemoveEntry={async (id) => {
                    try {
                      const entry = data.expenses.find((e) => e.id === id);
                      const description = entry?.description || "Entry";

                      await removeEntry("expenses", id);
                      flashCounterRef.current += 1;
                      setLastSaved({
                        kind: "entry-desc",
                        id,
                        token: flashCounterRef.current,
                      });

                      toast.success("Expense deleted", {
                        description: `${description} was removed successfully`,
                      });
                    } catch (error) {
                      console.error("Failed to delete expense entry:", error);
                      toast.error("Failed to delete expense", {
                        description: "Please try again",
                      });
                    }
                  }}
                  type="expense"
                  isOpen={expenseOpen}
                  onToggle={() => setExpenseOpen(!expenseOpen)}
                  hideAddButton={true}
                  guidedDialogOpen={expenseGuidedDialogOpen}
                  onGuidedDialogOpenChange={setExpenseGuidedDialogOpen}
                  flashEntryId={
                    guidedEntryFlash?.type === "expenses"
                      ? guidedEntryFlash.entryId
                      : undefined
                  }
                  flashToken={
                    guidedEntryFlash?.type === "expenses"
                      ? guidedEntryFlash.token
                      : undefined
                  }
                  onCommitDescription={async (id, desc) => {
                    const res: CommitResult = await commitEntryDescription(
                      "expenses",
                      id,
                      desc
                    );
                    if (res.success === false && res.conflict) return false;
                    if (res.success) {
                      flashCounterRef.current += 1;
                      setLastSaved({
                        kind: "entry-desc",
                        id,
                        token: flashCounterRef.current,
                      });
                    }
                    return res.success;
                  }}
                  onCommitAmount={async (id, monthIndex, amount) => {
                    const res: CommitResult = await commitEntryAmount(
                      "expenses",
                      id,
                      monthIndex,
                      amount
                    );
                    if (res.success === false && res.conflict) return false;
                    if (res.success) {
                      flashCounterRef.current += 1;
                      setLastSaved({
                        kind: "entry-amount",
                        id,
                        monthIndex,
                        token: flashCounterRef.current,
                      });
                    }
                    return res.success;
                  }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="management">
            <DataManagement
              data={data}
              onImportData={handleImportData}
              onClearData={handleClearData}
            />
          </TabsContent>
        </Tabs>
      </main>
      <ConflictConfirmationDialog
        isOpen={!!conflictData}
        conflictingData={conflictData}
        currentData={data}
        onConfirm={handleForceSave}
        onCancel={cancelConflict}
        conflictType={conflictType}
      />
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

import { AuthGate } from "@/components/auth/auth-gate";

export default function Page() {
  return (
    <AuthGate>
      <Suspense fallback={<div>Loading...</div>}>
        <HomePageContent />
      </Suspense>
    </AuthGate>
  );
}

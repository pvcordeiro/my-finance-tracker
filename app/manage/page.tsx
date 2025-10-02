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
    saveBankAmount,
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
  const [showConfirm, setShowConfirm] = useState(false);
  const nextRouteRef = useRef<string | null>(null);
  const sessionExpiredRef = useRef(false);
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") === "management" ? "management" : "main"
  );

  useEffect(() => {
    const tab = searchParams.get("tab");
    setActiveTab(tab === "management" ? "management" : "main");
  }, [searchParams]);

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

  const handleSaveBankAmount = async (
    dataToSave?: FinanceData,
    onSessionExpired?: () => void
  ) => {
    try {
      const result = await saveBankAmount(dataToSave, onSessionExpired);
      if (result && "conflict" in result && result.conflict) {
        return;
      }
      if (result?.success) {
        flashCounterRef.current += 1;
        setLastSaved({ kind: "bank", token: flashCounterRef.current });
      }
    } catch (error) {
      console.error("Failed to save bank amount:", error);
    }
  };

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

              {/* Right Column - Income and Expenses */}
              <div className="space-y-4">
                <EntryForm
                  title="Income"
                  entries={data.incomes}
                  onAddEntry={() => addEntry("incomes")}
                  onUpdateEntry={(id, field, value, monthIndex) =>
                    updateEntry("incomes", id, field, value, monthIndex)
                  }
                  onRemoveEntry={async (id) => {
                    try {
                      await removeEntry("incomes", id);
                      flashCounterRef.current += 1;
                      setLastSaved({
                        kind: "entry-desc",
                        id,
                        token: flashCounterRef.current,
                      });
                    } catch (error) {
                      console.error("Failed to delete income entry:", error);
                    }
                  }}
                  type="income"
                  isOpen={incomeOpen}
                  onToggle={() => setIncomeOpen(!incomeOpen)}
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
                  onUpdateEntry={(id, field, value, monthIndex) =>
                    updateEntry("expenses", id, field, value, monthIndex)
                  }
                  onRemoveEntry={async (id) => {
                    try {
                      await removeEntry("expenses", id);
                      flashCounterRef.current += 1;
                      setLastSaved({
                        kind: "entry-desc",
                        id,
                        token: flashCounterRef.current,
                      });
                    } catch (error) {
                      console.error("Failed to delete expense entry:", error);
                    }
                  }}
                  type="expense"
                  isOpen={expenseOpen}
                  onToggle={() => setExpenseOpen(!expenseOpen)}
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

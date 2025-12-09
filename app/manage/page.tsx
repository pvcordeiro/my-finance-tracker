"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useFinanceData } from "@/hooks/use-finance-data";
import { DashboardHeader } from "@/components/finance/dashboard-header";
import { BankAmount } from "@/components/finance/bank-amount";
import { BalanceHistory } from "@/components/finance/balance-history";
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
import type { FinanceData, CommitResult } from "@/hooks/use-finance-data";
import { useLanguage } from "@/hooks/use-language";

function HomePageContent() {
  const { currencySymbol, t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    data,
    hasChanges,
    commitEntryDescription,
    commitEntryAmount,
    updateBankAmount,
    addEntry,
    updateEntry,
    removeEntry,
    setData,
    addToBankAmount,
    subtractFromBankAmount,
    entryFlashState,
  } = useFinanceData();
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [incomeGuidedDialogOpen, setIncomeGuidedDialogOpen] = useState(false);
  const [expenseGuidedDialogOpen, setExpenseGuidedDialogOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const nextRouteRef = useRef<string | null>(null);
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
  const incomeSectionRef = useRef<HTMLDivElement | null>(null);
  const expenseSectionRef = useRef<HTMLDivElement | null>(null);
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
        const newEntry = entries[0];

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
            type === "incomes"
              ? t("entries.incomeAdded")
              : t("entries.expenseAdded"),
            {
              description: description || t("entries.newEntryCreated"),
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
    t,
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
    if (!user) return;

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
      console.error("SSE error:", {
        readyState: eventSource.readyState,
        url: eventSource.url,
        error: error,
      });

      if (eventSource.readyState === EventSource.CLOSED) {
        console.log("SSE connection closed, will reconnect on next render");
      }
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [user, data.bankAmount, updateBankAmount]);

  const handleAddToBankAmount = async (delta: number, note?: string) => {
    await addToBankAmount(delta, note);
    flashCounterRef.current += 1;
    setLastSaved({
      kind: "bank",
      token: flashCounterRef.current,
      flashType: "add",
    });
  };

  const handleSubtractFromBankAmount = async (delta: number, note?: string) => {
    await subtractFromBankAmount(delta, note);
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

    setIncomeOpen(true);

    setTimeout(() => {
      if (incomeSectionRef.current) {
        const offset = 120;
        const elementTop =
          incomeSectionRef.current.getBoundingClientRect().top +
          window.pageYOffset;
        window.scrollTo({
          top: elementTop - offset,
          behavior: "smooth",
        });
      }
    }, 100);

    addEntry("incomes");
  };

  const handleGuidedAddExpense = (description: string, amounts: number[]) => {
    pendingGuidedEntryRef.current = {
      type: "expenses",
      description,
      amounts,
    };

    setExpenseOpen(true);

    setTimeout(() => {
      if (expenseSectionRef.current) {
        const offset = 120;
        const elementTop =
          expenseSectionRef.current.getBoundingClientRect().top +
          window.pageYOffset;
        window.scrollTo({
          top: elementTop - offset,
          behavior: "smooth",
        });
      }
    }, 100);

    addEntry("expenses");
  };

  const handleResolveCurrentMonth = async (
    type: "incomes" | "expenses",
    id: string,
    monthIndex: number,
    amount: number
  ) => {
    try {
      const entry =
        type === "incomes"
          ? data.incomes.find((e) => e.id === id)
          : data.expenses.find((e) => e.id === id);

      const description = entry?.description || t("entries.entry");

      updateEntry(type, id, "amount", 0, monthIndex);
      await commitEntryAmount(type, id, monthIndex, 0);

      toast.success(
        type === "incomes"
          ? t("entries.incomeResolved")
          : t("entries.expenseResolved"),
        {
          description: `${currencySymbol}${amount.toFixed(2)} ${t(
            "entries.from"
          )} "${description}" ${t("entries.markedAs")} ${
            type === "incomes" ? t("entries.received") : t("entries.paid")
          }`,
        }
      );
    } catch (error) {
      console.error("Failed to resolve current month:", error);
      toast.error(t("entries.failedToResolve"), {
        description: t("entries.pleaseTryAgain"),
      });
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen finance-gradient lg:h-screen lg:overflow-hidden">
      <DashboardHeader />
      <main className="container mx-auto p-4 pt-0 space-y-6 lg:h-full lg:overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6 lg:h-full"
        >
          <TabsContent value="main" className="lg:h-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:h-full">
              {/* Left Column - Bank Amount */}
              <div className="space-y-4 pt-2 lg:overflow-y-auto lg:pr-1 lg:h-full lg:pb-36">
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
                <BalanceHistory
                  groupId={user?.current_group_id || null}
                  refreshTrigger={
                    lastSaved?.kind === "bank" ? lastSaved.token : undefined
                  }
                />
              </div>
              {/* Right Column - Add Buttons + Income and Expenses */}
              <div className="space-y-4 pt-2 lg:overflow-y-auto lg:pl-1 lg:h-full lg:pb-36">
                {/* Add Entry Buttons */}
                <div className="space-y-3 pt-3 border-t lg:border-t-0 lg:pt-0 lg:space-y-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      onClick={() => {
                        setIncomeGuidedDialogOpen(true);
                      }}
                      variant="outline"
                      className="w-full transition-all duration-200 active:scale-[0.98] touch-manipulation py-4 sm:py-3 border-finance-positive/30 hover:bg-card"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t("entries.addIncome")}
                    </Button>
                    <Button
                      onClick={() => {
                        setExpenseGuidedDialogOpen(true);
                      }}
                      variant="outline"
                      className="w-full transition-all duration-200 active:scale-[0.98] touch-manipulation py-4 sm:py-3 border-finance-negative/30 hover:bg-card"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t("entries.addExpense")}
                    </Button>
                  </div>
                </div>

                <EntryForm
                  ref={incomeSectionRef}
                  title={t("entries.income")}
                  entries={data.incomes}
                  onAddEntry={() => addEntry("incomes")}
                  onGuidedAddEntry={handleGuidedAddIncome}
                  onUpdateEntry={(id, field, value, monthIndex) =>
                    updateEntry("incomes", id, field, value, monthIndex)
                  }
                  onRemoveEntry={async (id) => {
                    try {
                      const entry = data.incomes.find((e) => e.id === id);
                      const description =
                        entry?.description || t("entries.entry");

                      await removeEntry("incomes", id);
                      flashCounterRef.current += 1;
                      setLastSaved({
                        kind: "entry-desc",
                        id,
                        token: flashCounterRef.current,
                      });

                      toast.success(t("entries.incomeDeleted"), {
                        description: `${description} ${t(
                          "entries.removedSuccessfully"
                        )}`,
                      });
                    } catch (error) {
                      console.error("Failed to delete income entry:", error);
                      toast.error(t("entries.failedToDeleteIncome"), {
                        description: t("entries.pleaseTryAgain"),
                      });
                    }
                  }}
                  onResolveCurrentMonth={async (id, monthIndex, amount) => {
                    await handleResolveCurrentMonth(
                      "incomes",
                      id,
                      monthIndex,
                      amount
                    );
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
                  totalFlashToken={entryFlashState.incomes?.token}
                  totalFlashType={entryFlashState.incomes?.flashType}
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
                  ref={expenseSectionRef}
                  title={t("entries.expenses")}
                  entries={data.expenses}
                  onAddEntry={() => addEntry("expenses")}
                  onGuidedAddEntry={handleGuidedAddExpense}
                  onUpdateEntry={(id, field, value, monthIndex) =>
                    updateEntry("expenses", id, field, value, monthIndex)
                  }
                  onRemoveEntry={async (id) => {
                    try {
                      const entry = data.expenses.find((e) => e.id === id);
                      const description =
                        entry?.description || t("entries.entry");

                      await removeEntry("expenses", id);
                      flashCounterRef.current += 1;
                      setLastSaved({
                        kind: "entry-desc",
                        id,
                        token: flashCounterRef.current,
                      });

                      toast.success(t("entries.expenseDeleted"), {
                        description: `${description} ${t(
                          "entries.removedSuccessfully"
                        )}`,
                      });
                    } catch (error) {
                      console.error("Failed to delete expense entry:", error);
                      toast.error(t("entries.failedToDeleteExpense"), {
                        description: t("entries.pleaseTryAgain"),
                      });
                    }
                  }}
                  onResolveCurrentMonth={async (id, monthIndex, amount) => {
                    await handleResolveCurrentMonth(
                      "expenses",
                      id,
                      monthIndex,
                      amount
                    );
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
                  totalFlashToken={entryFlashState.expenses?.token}
                  totalFlashType={entryFlashState.expenses?.flashType}
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
      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("manage.unsavedChanges")}</DialogTitle>
          </DialogHeader>
          <div className="py-2">{t("manage.unsavedChangesDescription")}</div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelNavigation}>
              {t("manage.stay")}
            </Button>
            <Button variant="destructive" onClick={confirmNavigation}>
              {t("manage.leavePage")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { AuthGate } from "@/components/auth/auth-gate";
import { FullPageLoader } from "@/components/ui/loading";

export default function ManagePage() {
  return (
    <AuthGate>
      <Suspense fallback={<FullPageLoader />}>
        <HomePageContent />
      </Suspense>
    </AuthGate>
  );
}

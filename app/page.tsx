"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useFinanceData } from "@/hooks/use-finance-data";
import { DashboardHeader } from "@/components/finance/dashboard-header";
import { BankAmount } from "@/components/finance/bank-amount";
import { EntryForm } from "@/components/finance/entry-form";
import { Button } from "@/components/ui/button";
import { Save, BarChart3, FileText, Settings, Edit } from "lucide-react";
import { DataManagement } from "@/components/finance/data-management";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    setData,
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

  const handleImportData = async (importedData: any) => {
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

  if (isLoading) {
    return <FullPageLoader message="Loading your financial data..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen finance-gradient">
      <DashboardHeader />
      <main className="container mx-auto p-4 space-y-6">
        <Tabs defaultValue="main" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="main" className="flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Manage
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="main">
            <div className="space-y-6">
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
              <BankAmount
                amount={data.bankAmount}
                onChange={updateBankAmount}
              />

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

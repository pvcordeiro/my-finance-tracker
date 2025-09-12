"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useFinanceData } from "@/hooks/use-finance-data";
import { DashboardHeader } from "@/components/finance/dashboard-header";
import { BankAmount } from "@/components/finance/bank-amount";
import { EntryForm } from "@/components/finance/entry-form";
import { Button } from "@/components/ui/button";
import { BarChart3, FileText, Settings, Edit } from "lucide-react";
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
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const {
    data,
    hasChanges,
    isLoading: dataLoading,
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
  const [showSaved, setShowSaved] = useState(false);
  const nextRouteRef = useRef<string | null>(null);
  const sessionExpiredRef = useRef(false);

  useEffect(() => {
    if (!isLoading && !user && !sessionExpiredRef.current) {
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

  const triggerSavedPopup = () => {
    setTimeout(() => {
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1000);
    }, 300);
  };

  const handleSessionExpired = async () => {
    sessionExpiredRef.current = true;
    await logout();
    router.push("/login?session=expired");
  };

  useEffect(() => {
    if (!isLoading && !user && !sessionExpiredRef.current) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen finance-gradient">
      <DashboardHeader />
      {showSaved && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded shadow z-50 transition-opacity pointer-events-none text-sm whitespace-nowrap">
          Your changes have been saved
        </div>
      )}
      <main className="container mx-auto p-4 space-y-6">
        <Tabs defaultValue="main" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="main" className="flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Backup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="main">
            <div className="space-y-4">
              <BankAmount
                amount={data.bankAmount}
                onChange={updateBankAmount}
                onBlur={() => {
                  saveData(undefined, handleSessionExpired);
                  triggerSavedPopup();
                }}
              />
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
                    triggerSavedPopup();
                  } catch (error) {
                    console.error("Failed to delete income entry:", error);
                  }
                }}
                type="income"
                isOpen={incomeOpen}
                onToggle={() => setIncomeOpen(!incomeOpen)}
                saveData={saveData}
                triggerSavedPopup={triggerSavedPopup}
                handleSessionExpired={handleSessionExpired}
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
                    triggerSavedPopup();
                  } catch (error) {
                    console.error("Failed to delete expense entry:", error);
                  }
                }}
                type="expense"
                isOpen={expenseOpen}
                onToggle={() => setExpenseOpen(!expenseOpen)}
                saveData={saveData}
                triggerSavedPopup={triggerSavedPopup}
                handleSessionExpired={handleSessionExpired}
              />
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

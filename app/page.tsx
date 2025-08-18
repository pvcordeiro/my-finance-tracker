"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useFinanceData } from "@/hooks/use-finance-data";
import { DashboardHeader } from "@/components/finance/dashboard-header";
import { BankAmount } from "@/components/finance/bank-amount";
import { EntryForm } from "@/components/finance/entry-form";
import { Button } from "@/components/ui/button";
import { Save, BarChart3, FileText } from "lucide-react";
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

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

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
                            updateEntry(
                                "expenses",
                                id,
                                field,
                                value,
                                monthIndex
                            )
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
                            onClick={saveData}
                            className="shadow-lg transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] bg-emerald-600 hover:bg-emerald-700 touch-manipulation h-12 sm:h-10 px-4 sm:px-3"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Save</span>
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        className="transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] touch-manipulation h-12 sm:h-10 px-4 sm:px-3"
                        onClick={() => router.push("/summary")}
                    >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Summary</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] bg-white/90 backdrop-blur-sm touch-manipulation h-12 sm:h-10 px-4 sm:px-3"
                        onClick={() => router.push("/details")}
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Details</span>
                    </Button>
                </div>
            </main>
        </div>
    );
}

export default function Page() {
    return <HomePage />;
}

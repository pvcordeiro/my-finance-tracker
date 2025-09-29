"use client";

import { Suspense, lazy } from "react";
import { useFinanceData } from "@/hooks/use-finance-data";
import { DashboardHeader } from "@/components/finance/dashboard-header";
import { SummaryTable } from "@/components/finance/summary-table";
import { ErrorBoundary } from "@/components/error-boundary";
import { LoadingState } from "@/components/ui/loading";
import { AuthGate } from "@/components/auth/auth-gate";

const FinancialChart = lazy(() =>
  import("@/components/finance/financial-chart").then((mod) => ({
    default: mod.FinancialChart,
  }))
);

function SummaryPageContent() {
  const { data } = useFinanceData();

  return (
    <div className="min-h-screen finance-gradient">
      <DashboardHeader />
      <main className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              Financial Summary
            </h1>
            <p className="text-muted-foreground">
              Your complete financial overview
            </p>
          </div>
        </div>
        <SummaryTable data={data} />
        <Suspense fallback={<LoadingState message="Loading chart..." />}>
          <FinancialChart data={data} />
        </Suspense>
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <ErrorBoundary>
      <AuthGate>
        <SummaryPageContent />
      </AuthGate>
    </ErrorBoundary>
  );
}

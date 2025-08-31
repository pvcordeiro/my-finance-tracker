"use client";

import { useEffect, Suspense, lazy } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AuthProvider } from "@/hooks/use-auth";
import { useFinanceData } from "@/hooks/use-finance-data";
import { DashboardHeader } from "@/components/finance/dashboard-header";
import { SummaryTable } from "@/components/finance/summary-table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, FileText } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";

const FinancialChart = lazy(() =>
  import("@/components/finance/financial-chart").then((mod) => ({
    default: mod.FinancialChart,
  }))
);

function SummaryPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { data, isLoading: dataLoading } = useFinanceData();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen finance-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading summary...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

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
        {dataLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : (
          <>
            <SummaryTable data={data} />
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <FinancialChart data={data} />
            </Suspense>
          </>
        )}
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <SummaryPage />
      </ErrorBoundary>
    </AuthProvider>
  );
}

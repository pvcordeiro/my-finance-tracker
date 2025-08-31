"use client";

import { useEffect, Suspense, lazy, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AuthProvider } from "@/hooks/use-auth";
import { useFinanceData } from "@/hooks/use-finance-data";
import { DashboardHeader } from "@/components/finance/dashboard-header";
import { SummaryTable } from "@/components/finance/summary-table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, FileText } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { LoadingState, FullPageLoader } from "@/components/ui/loading";

const FinancialChart = lazy(() =>
  import("@/components/finance/financial-chart").then((mod) => ({
    default: mod.FinancialChart,
  }))
);

function SummaryPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { data } = useFinanceData();
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowLoader(true), 100); // Delay spinner by 100ms
      return () => clearTimeout(timer);
    } else {
      setShowLoader(false);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen finance-gradient">
      <DashboardHeader />
      {showLoader ? (
        <FullPageLoader message="Loading your financial summary..." />
      ) : (
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
      )}
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

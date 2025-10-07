"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { useFinanceData } from "@/hooks/use-finance-data";
import { DashboardHeader } from "@/components/finance/dashboard-header";
import { DetailsTable } from "@/components/finance/details-table";
import { AuthGate } from "@/components/auth/auth-gate";

function DetailsPageContent() {
  const { data } = useFinanceData();

  return (
    <div className="min-h-screen finance-gradient">
      <Suspense fallback={<div>Loading...</div>}>
        <DashboardHeader />
      </Suspense>
      <main className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              Financial Details
            </h1>
            <p className="text-muted-foreground">
              Detailed view and data management
            </p>
          </div>
        </div>
        <DetailsTable data={data} />
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <AuthGate>
      <DetailsPageContent />
    </AuthGate>
  );
}

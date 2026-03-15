"use client";

export const dynamic = "force-dynamic";

import { useFinanceData } from "@/hooks/use-finance-data";
import { DashboardHeader } from "@/components/finance/dashboard-header";
import { DetailsTable } from "@/components/finance/details-table";
import { AuthGate } from "@/components/auth/auth-gate";
import { useLanguage } from "@/hooks/use-language";

function DetailsPageContent() {
  const { data } = useFinanceData();
  const { t } = useLanguage();

  return (
    <div className="min-h-dvh finance-gradient page-nav-padding">
      <DashboardHeader />
      <main className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              {t("details.title")}
            </h1>
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

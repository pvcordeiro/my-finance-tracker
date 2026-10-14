"use client";

export const dynamic = "force-dynamic";

import { useFinanceData } from "@/hooks/use-finance-data";
import { DashboardHeader } from "@/components/finance/dashboard-header";
import { DetailsTable } from "@/components/finance/details-table";
import { AuthGate } from "@/components/auth/auth-gate";
import { useLanguage } from "@/hooks/use-language";
import { LoadingState } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { useGuidedTourMode } from "@/hooks/use-guided-tour-mode";
import { guidedTourFinanceData } from "@/lib/guided-tour-data";

function DetailsPageContent() {
  const { data, isLoading, loadError, refreshData } = useFinanceData();
  const isGuidedTourActive = useGuidedTourMode();
  const { t } = useLanguage();

  return (
    <div className="min-h-dvh finance-gradient page-nav-padding">
      <DashboardHeader />
      <main className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold text-primary-contrast">
              {t("details.title")}
            </h1>
          </div>
        </div>
        {isLoading ? (
          <LoadingState message={t("common.loadingFinancialData")} />
        ) : loadError ? (
          <div className="rounded-xl border border-destructive/30 bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t("common.failedToLoadFinancialData")}
            </p>
            <Button className="mt-4" variant="outline" onClick={() => void refreshData()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : (
          <DetailsTable data={isGuidedTourActive ? guidedTourFinanceData : data} tourPreview={isGuidedTourActive} readOnly={isGuidedTourActive} />
        )}
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

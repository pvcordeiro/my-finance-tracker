"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrivacyNumber } from "@/components/ui/privacy-number";
import { useLanguage } from "@/hooks/use-language";
import type { PendingOccurrence } from "@/hooks/use-finance-data";
import { Check } from "lucide-react";

export function PendingOccurrences({
  occurrences,
  onResolve,
  onDismiss,
}: {
  occurrences: PendingOccurrence[];
  onResolve: (occurrence: PendingOccurrence) => void;
  onDismiss?: (occurrence: PendingOccurrence) => void;
}) {
  const { t } = useLanguage();
  if (!occurrences.length) return null;

  const monthKeys = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

  return (
    <Card className="border-amber-500/30 bg-amber-500/[0.035] shadow-none max-h-[24vh] overflow-y-auto">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg">
          {t("entries.pendingOccurrences")}
          <span className="ml-2 text-sm font-normal text-muted-foreground">{occurrences.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {occurrences.map((occurrence) => {
          const monthLabel = t(`months.${monthKeys[occurrence.month - 1]}`);
          return (
            <div key={`${occurrence.entryId}-${occurrence.year}-${occurrence.month}`} className="flex items-center gap-3 rounded-lg border border-border/70 bg-card px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{occurrence.description}</p>
                <p className="text-xs text-muted-foreground">
                  {t("entries.pendingMonth").replace("{month}", monthLabel).replace("{year}", String(occurrence.year))}
                </p>
              </div>
              <span className={`shrink-0 text-sm font-semibold tabular-nums ${occurrence.type === "income" ? "text-finance-positive" : "text-finance-negative"}`}>
                <PrivacyNumber value={occurrence.amount} />
              </span>
              {onDismiss && <Button size="sm" variant="ghost" className="h-9 shrink-0 px-2.5 sm:px-3" onClick={() => onDismiss(occurrence)}>{t("entries.dismissPending")}</Button>}
              <Button size="sm" variant="outline" className="h-9 shrink-0 px-2.5 sm:px-3" onClick={() => onResolve(occurrence)} aria-label={`${t("entries.markPendingResolved")}: ${occurrence.description}`}>
                <Check className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{t("entries.markPendingResolved")}</span>
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

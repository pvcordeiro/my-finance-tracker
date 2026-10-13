"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrivacyNumber } from "@/components/ui/privacy-number";
import { PrivacyText } from "@/components/ui/privacy-text";
import { useLanguage } from "@/hooks/use-language";
import type { PendingOccurrence } from "@/hooks/use-finance-data";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown, Clock3 } from "lucide-react";
import { useState } from "react";

export function PendingOccurrences({
  occurrences,
  onResolve,
  onDismiss,
  isOpen: controlledIsOpen,
  onOpenChange,
}: {
  occurrences: PendingOccurrence[];
  onResolve: (occurrence: PendingOccurrence) => void;
  onDismiss?: (occurrence: PendingOccurrence) => void;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}) {
  const { t } = useLanguage();
  const [localOpen, setLocalOpen] = useState(false);
  const expanded = controlledIsOpen ?? localOpen;
  const setExpanded = (next: boolean) => {
    if (controlledIsOpen === undefined) setLocalOpen(next);
    onOpenChange?.(next);
  };
  if (!occurrences.length) return null;

  const monthKeys = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

  return (
    <Card className="overflow-hidden border-amber-500/30 bg-card shadow-none">
      <CardHeader
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={expanded ? t("common.collapse") : t("common.expand")}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setExpanded(!expanded);
          }
        }}
        className="flex-row cursor-pointer items-center justify-between gap-3 bg-amber-500/[0.07] px-4 py-3 transition-colors hover:bg-amber-500/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
            <Clock3 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold sm:text-base">{t("entries.pendingOccurrences")}</CardTitle>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{t("entries.pendingOccurrencesHelp")}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="secondary">{occurrences.length}</Badge>
          <Button type="button" size="icon" variant="ghost" className="pointer-events-none h-9 w-9" tabIndex={-1} aria-hidden="true">
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      {expanded && <CardContent className="space-y-2 p-3 sm:p-4">
        {occurrences.map((occurrence) => {
          const monthLabel = t(`months.${monthKeys[occurrence.month - 1]}`);
          const resolveLabel = occurrence.isIncome ? t("entries.markReceived") : t("entries.markPaid");
          return (
            <div key={`${occurrence.entryId}-${occurrence.year}-${occurrence.month}`} className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background px-3 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-4">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-medium"><PrivacyText value={occurrence.description} /></p>
                  <Badge variant="outline" className={`shrink-0 text-[10px] ${occurrence.isIncome ? "border-finance-positive/30 text-finance-positive" : "border-finance-negative/30 text-finance-negative"}`}>
                    {occurrence.isIncome ? t("entries.income") : t("entries.expenses")}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("entries.pendingMonth").replace("{month}", monthLabel).replace("{year}", String(occurrence.year))}
                </p>
              </div>
              <span className={`self-start text-sm font-semibold tabular-nums sm:ml-auto sm:self-auto sm:shrink-0 ${occurrence.isIncome ? "text-finance-positive" : "text-finance-negative"}`}>
                <PrivacyNumber value={occurrence.amount} />
              </span>
              <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                {onDismiss && <Button size="sm" variant="outline" className="h-9 border-border bg-card px-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground sm:px-3 sm:text-sm" onClick={() => onDismiss(occurrence)}>{occurrence.isIncome ? t("entries.dismissPendingIncome") : t("entries.dismissPendingExpense")}</Button>}
                <Button size="sm" variant="outline" className="h-9 border-finance-positive/35 px-2.5 text-xs text-finance-positive hover:bg-finance-positive/10 hover:text-finance-positive sm:px-3 sm:text-sm" onClick={() => onResolve(occurrence)} aria-label={resolveLabel}>
                  <Check className="h-4 w-4 sm:mr-1.5" />
                  <span>{resolveLabel}</span>
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>}
    </Card>
  );
}

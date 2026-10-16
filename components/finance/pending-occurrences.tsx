"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrivacyNumber } from "@/components/ui/privacy-number";
import { PrivacyText } from "@/components/ui/privacy-text";
import { useLanguage } from "@/hooks/use-language";
import type { PendingOccurrence } from "@/hooks/use-finance-data";
import { Badge } from "@/components/ui/badge";
import { Ban, Check, ChevronDown, Clock3 } from "lucide-react";
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function PendingOccurrences({
  occurrences,
  onResolve,
  onDismiss,
  isOpen: controlledIsOpen,
  onOpenChange,
  tourReadOnly = false,
  tourAutoExpand = false,
}: {
  occurrences: PendingOccurrence[];
  onResolve: (occurrence: PendingOccurrence) => void | Promise<void>;
  onDismiss?: (occurrence: PendingOccurrence) => void | Promise<void>;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  tourReadOnly?: boolean;
  tourAutoExpand?: boolean;
}) {
  const { t } = useLanguage();
  const [localOpen, setLocalOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const expanded = tourReadOnly && tourAutoExpand ? true : controlledIsOpen ?? localOpen;
  const setExpanded = (next: boolean) => {
    if (controlledIsOpen === undefined) setLocalOpen(next);
    onOpenChange?.(next);
  };
  const monthKeys = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const months = useMemo(() => Array.from(new Set(occurrences.map((item) => `${item.year}-${item.month}`))).sort((a, b) => a.localeCompare(b)), [occurrences]);
  if (!occurrences.length) return null;
  const filteredOccurrences = occurrences.filter((item) => {
    if (filter === "income") return item.isIncome;
    if (filter === "expense") return !item.isIncome;
    if (filter === "all") return true;
    const [year, month] = filter.split("-").map(Number);
    return item.year === year && item.month === month;
  });
  const displayOccurrences = filteredOccurrences;
  const occurrenceKey = (item: PendingOccurrence) => `${item.entryId}-${item.year}-${item.month}`;
  const selectedOccurrences = filteredOccurrences.filter((item) => selected.has(occurrenceKey(item)));
  const resolveSelected = async () => {
    for (const occurrence of selectedOccurrences) await onResolve(occurrence);
    setSelected(new Set());
  };
  const dismissSelected = async () => {
    if (!onDismiss) return;
    for (const occurrence of selectedOccurrences) await onDismiss(occurrence);
    setSelected(new Set());
  };

  return (
    <Card data-tour={tourReadOnly ? "tour-pending" : undefined} className="overflow-hidden border-amber-500/30 bg-card shadow-none">
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
          <span className="pending-warning-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
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
        <div className="space-y-2 pb-1 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-2 sm:space-y-0">
          <p className="text-xs text-muted-foreground">{t("entries.showingPending").replace("{count}", String(filteredOccurrences.length))}</p>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-nowrap sm:items-center">
          <Select value={filter} onValueChange={(value) => { setFilter(value); setSelected(new Set()); }}>
            <SelectTrigger className="col-span-2 h-9 w-full sm:col-span-1 sm:w-48 sm:shrink-0" aria-label={t("common.filter")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("entries.allPending")}</SelectItem>
              <SelectItem value="income">{t("entries.pendingIncomeOnly")}</SelectItem>
              <SelectItem value="expense">{t("entries.pendingExpenseOnly")}</SelectItem>
              {months.map((key) => {
                const [year, month] = key.split("-").map(Number);
                return <SelectItem key={key} value={key}>{t(`months.${monthKeys[month - 1]}`)} {year}</SelectItem>;
              })}
            </SelectContent>
          </Select>
          {onDismiss && <Button size="sm" variant="outline" className="h-9 w-full min-w-0 whitespace-nowrap px-2 text-[11px] sm:w-auto sm:shrink-0 sm:px-3 sm:text-sm" disabled={tourReadOnly || selectedOccurrences.length === 0} onClick={() => void dismissSelected()}>
            <Ban className="mr-1 h-4 w-4 shrink-0" /><span className="truncate">{t("entries.markSelectedPendingShort").replace("{count}", String(selectedOccurrences.length))}</span>
          </Button>}
          <Button size="sm" variant="outline" className="h-9 w-full min-w-0 whitespace-nowrap px-2 text-[11px] sm:w-auto sm:shrink-0 sm:px-3 sm:text-sm" disabled={tourReadOnly || selected.size === 0} onClick={() => void resolveSelected()}>
            <Check className="mr-1 h-4 w-4 shrink-0" /><span className="truncate">{t("entries.resolveSelectedShort").replace("{count}", String(selected.size))}</span>
          </Button>
          </div>
        </div>
        {filteredOccurrences.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">{t("entries.noPendingMatches")}</p>}
        {displayOccurrences.map((occurrence, index) => {
          const monthLabel = t(`months.${monthKeys[occurrence.month - 1]}`);
          const resolveLabel = occurrence.isIncome ? t("entries.markReceived") : t("entries.markPaid");
          return (
            <div key={occurrenceKey(occurrence)} className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 rounded-lg border border-border/70 bg-background px-3 py-3 sm:flex sm:gap-3 sm:px-4">
              <input type="checkbox" aria-label={t("entries.selectPending").replace("{description}", occurrence.description)} className="col-start-1 row-start-1 h-4 w-4 shrink-0 accent-primary" checked={selected.has(occurrenceKey(occurrence))} disabled={tourReadOnly} onChange={(event) => setSelected((previous) => { const next = new Set(previous); if (event.target.checked) next.add(occurrenceKey(occurrence)); else next.delete(occurrenceKey(occurrence)); return next; })} />
              <div className="col-start-2 row-start-1 min-w-0 sm:flex-1">
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
              <span className={`col-start-3 row-start-1 pl-1 text-right text-sm font-semibold tabular-nums sm:ml-auto sm:shrink-0 sm:pl-0 ${occurrence.isIncome ? "text-finance-positive" : "text-finance-negative"}`}>
                <PrivacyNumber value={occurrence.amount} />
              </span>
              <div className="col-span-2 col-start-2 row-start-2 flex w-full items-center justify-end gap-2 sm:col-auto sm:row-auto sm:w-auto">
                {onDismiss && <Button size="sm" variant="outline" className="h-9 min-w-0 flex-1 whitespace-nowrap border-border bg-card px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground sm:flex-none sm:px-3 sm:text-sm" onClick={() => { if (!tourReadOnly) onDismiss(occurrence); }} disabled={tourReadOnly}><Ban className="mr-1 h-4 w-4 shrink-0" />{occurrence.isIncome ? t("entries.dismissPendingIncome") : t("entries.dismissPendingExpense")}</Button>}
                  <Button size="sm" variant="outline" className="h-9 min-w-0 flex-1 whitespace-nowrap border-finance-positive/35 px-2 text-xs text-finance-positive hover:bg-finance-positive/10 hover:text-finance-positive sm:flex-none sm:px-3 sm:text-sm" onClick={() => { if (!tourReadOnly) onResolve(occurrence); }} aria-label={resolveLabel} disabled={tourReadOnly}>
                  <Check className="h-4 w-4 sm:mr-1.5" />
                  <span>{occurrence.isIncome ? t("entries.receivedShort") : t("entries.paidShort")}</span>
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>}
    </Card>
  );
}

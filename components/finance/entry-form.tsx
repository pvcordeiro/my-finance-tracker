"use client";
import { useState, useRef, useEffect, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Search,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GuidedEntryDialog } from "./guided-entry-dialog";
import { Switch } from "@/components/ui/switch";
import { EntryEditDialog } from "./entry-edit-dialog";
import { PrivacyNumber } from "@/components/ui/privacy-number";
import { PrivacyText } from "@/components/ui/privacy-text";
import { useLanguage } from "@/hooks/use-language";
import { getNextUnresolvedOccurrence } from "@/lib/rolling-months";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface FinanceEntry {
  id: string;
  description: string;
  amounts: number[];
  resolved?: boolean[];
  pendingAmounts?: number[];
  recurrent?: boolean;
  recurrenceAmount?: number;
  occurrenceIds?: (number | null)[];
  dismissed?: boolean[];
}

interface EntryFormProps {
  title: string;
  entries: FinanceEntry[];
  onAddEntry: () => void;
  onUpdateEntry: (
    id: string,
    field: string,
    value: string | number,
    monthIndex?: number
  ) => void;
  onRemoveEntry: (id: string) => Promise<void>;
  onResolveCurrentMonth: (
    id: string,
    monthIndex: number,
    amount: number,
    year: number,
    month: number,
    occurrenceId?: number | null
  ) => Promise<void>;
  type: "income" | "expense";
  isOpen: boolean;
  onToggle: () => void;
  onCommitDescription: (
    id: string,
    newDescription: string
  ) => Promise<boolean> | boolean;
  onCommitAmount: (
    id: string,
    monthIndex: number,
    amount: number
  ) => Promise<boolean> | boolean;
  onGuidedAddEntry: (description: string, amounts: number[], recurrent?: boolean, recurrenceAmount?: number) => void;
  flashEntryId?: string;
  flashToken?: number;
  hideAddButton?: boolean;
  onHeaderAdd?: () => void;
  guidedDialogOpen?: boolean;
  onGuidedDialogOpenChange?: (open: boolean) => void;
  totalFlashToken?: number;
  totalFlashType?: "increase" | "decrease";
  onCommitRecurrence?: (id: string, recurrent: boolean, recurrenceAmount: number) => Promise<boolean>;
}

export const EntryForm = forwardRef<HTMLDivElement, EntryFormProps>(
  function EntryForm(
    {
      title,
      entries,
      onUpdateEntry,
      onRemoveEntry,
      onResolveCurrentMonth,
      type,
      isOpen,
      onToggle,
      onCommitDescription,
      onCommitAmount,
      onGuidedAddEntry,
      flashEntryId,
      flashToken,
      hideAddButton = false,
      onHeaderAdd,
      guidedDialogOpen: externalGuidedDialogOpen,
      onGuidedDialogOpenChange,
      totalFlashToken,
      onCommitRecurrence,
    },
    ref
  ) {
    const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
    const [entryToResolve, setEntryToResolve] = useState<{
      entry: FinanceEntry;
      monthIndex: number;
      amount: number;
      year: number;
      month: number;
      occurrenceId?: number | null;
    } | null>(null);
    const [internalGuidedDialogOpen, setInternalGuidedDialogOpen] =
      useState(false);
    const [flashingEntries, setFlashingEntries] = useState<Set<string>>(
      new Set()
    );
    const entryCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<FinanceEntry | null>(
      null
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [totalFlashActive, setTotalFlashActive] = useState(false);

    const { t } = useLanguage();

    const guidedDialogOpen =
      externalGuidedDialogOpen !== undefined
        ? externalGuidedDialogOpen
        : internalGuidedDialogOpen;
    const setGuidedDialogOpen =
      onGuidedDialogOpenChange || setInternalGuidedDialogOpen;

    const getMonthLabel = (monthIndex: number): string => {
      const monthKeys = [
        "months.jan",
        "months.feb",
        "months.mar",
        "months.apr",
        "months.may",
        "months.jun",
        "months.jul",
        "months.aug",
        "months.sep",
        "months.oct",
        "months.nov",
        "months.dec",
      ];
      return t(monthKeys[monthIndex]);
    };

    const getRollingMonths = (): string[] => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const months = [];

      for (let i = 0; i < 12; i++) {
        const monthIndex = (currentMonth + i) % 12;
        months.push(getMonthLabel(monthIndex));
      }

      return months;
    };

    const rollingMonths = getRollingMonths();
    const sectionRef = useRef<HTMLDivElement | null>(null);

    const filteredEntries = entries.filter((entry) =>
      entry.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
      if (flashEntryId && flashToken) {
        // Poll for the card to appear in the DOM (it may not exist yet if the
        // server round-trip hasn't completed). Scroll first, flash after scroll.
        const startTime = Date.now();
        const tryScroll = () => {
          const card = entryCardRefs.current.get(flashEntryId);
          if (card) {
            const rect = card.getBoundingClientRect();
            const absoluteTop = rect.top + window.scrollY;
            const offset = 80;
            window.scrollTo({ top: absoluteTop - offset, behavior: "smooth" });
            // Flash after smooth scroll has had time to finish (~400ms)
            setTimeout(() => {
              setFlashingEntries((prev) => new Set(prev).add(flashEntryId));
              setTimeout(() => {
                setFlashingEntries((prev) => {
                  const ns = new Set(prev);
                  ns.delete(flashEntryId);
                  return ns;
                });
              }, 650);
            }, 400);
          } else if (Date.now() - startTime < 3000) {
            setTimeout(tryScroll, 100);
          }
        };
        setTimeout(tryScroll, 300);
      }
    }, [flashEntryId, flashToken, isOpen]);

    useEffect(() => {
      if (totalFlashToken !== undefined) {
        setTotalFlashActive(false);
        const t = setTimeout(() => setTotalFlashActive(true), 10);
        const clearT = setTimeout(() => setTotalFlashActive(false), 660);
        return () => {
          clearTimeout(t);
          clearTimeout(clearT);
        };
      }
    }, [totalFlashToken]);

    const calculateTotal = (amounts: number[]) => {
      return amounts.reduce((sum, amount) => sum + (amount || 0), 0);
    };

    const handleAddEntry = () => {
      if (!isOpen) {
        onToggle();
      }
      setGuidedDialogOpen(true);
    };

    const handleHeaderAdd = () => {
      onHeaderAdd?.();
    };

    const handleGuidedSubmit = (
      description: string,
      amounts: number[],
      recurrent: boolean,
      recurrenceAmount: number
    ) => {
      onGuidedAddEntry(description, amounts, recurrent, recurrenceAmount);
    };

    const handleSectionToggle = () => {
      const wasOpen = isOpen;
      onToggle();

      if (!wasOpen) {
        setTimeout(() => {
          if (sectionRef.current) {
            const isMobile = window.innerWidth < 640;
            if (isMobile) {
              const elementTop =
                sectionRef.current.getBoundingClientRect().top +
                window.scrollY;
              window.scrollTo({
                top: elementTop - 80,
                behavior: "smooth",
              });
            }
          }
        }, 500);
      }
    };

    const handleEntryClick = (entry: FinanceEntry) => {
      setSelectedEntry(entry);
      setEditDialogOpen(true);
    };

    const handleResolveCurrentMonth = async (
      e: React.MouseEvent,
      entry: FinanceEntry
    ) => {
      e.stopPropagation();

      const target = getNextUnresolvedOccurrence({ ...entry, amounts: entry.pendingAmounts || entry.amounts });
      if (!target) return;

      setEntryToResolve({
        entry,
        ...target,
      });
      setResolveDialogOpen(true);
    };

    const confirmResolveCurrentMonth = async () => {
      if (!entryToResolve) return;

      await onResolveCurrentMonth(
        entryToResolve.entry.id,
        entryToResolve.monthIndex,
        entryToResolve.amount,
        entryToResolve.year,
        entryToResolve.month,
        entryToResolve.occurrenceId
      );

      setFlashingEntries((prev) => new Set(prev).add(entryToResolve.entry.id));
      setTimeout(() => {
        setFlashingEntries((prev) => {
          const ns = new Set(prev);
          ns.delete(entryToResolve.entry.id);
          return ns;
        });
      }, 650);

      setResolveDialogOpen(false);
      setEntryToResolve(null);
    };

    return (
      <Card
        ref={(node) => {
          sectionRef.current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className={cn(
          "transition-all duration-200",
          type === "income" ? "income-card bg-finance-positive/5" : "expense-card bg-finance-negative/5"
        )}
      >
          <Collapsible open={isOpen} onOpenChange={handleSectionToggle}>
          <CardHeader className="flex-row items-center space-y-0 gap-2 px-4 py-3 sm:px-6 sm:py-5">
            <CollapsibleTrigger className="min-w-0 flex-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
              <div className="cursor-pointer touch-manipulation py-1">
               <CardTitle
                 className={cn(
                  "flex min-w-0 items-center justify-between gap-2 text-base sm:text-xl",
                  type === "income"
                    ? "text-finance-positive"
                    : "text-finance-negative"
                  )}
                >
                <span className="min-w-0 truncate">{title}</span>
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                  <span
                    className={cn(
                      "font-semibold text-sm sm:text-lg tracking-tight transition-all duration-300",
                      type === "income"
                        ? "text-finance-positive"
                        : "text-finance-negative",
                      totalFlashActive &&
                        (type === "income" ? "flash-success" : "flash-error")
                    )}
                  >
                    <PrivacyNumber
                      value={entries.reduce(
                        (sum, entry) => sum + calculateTotal(entry.amounts),
                        0
                      )}
                    />
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  )}
                </div>
              </CardTitle>
              </div>
            </CollapsibleTrigger>
            {onHeaderAdd && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleHeaderAdd}
                className={cn(
                  "h-9 shrink-0 gap-1.5 px-2.5 touch-manipulation sm:h-10 sm:px-3",
                  type === "income"
                    ? "border-finance-positive/35 text-finance-positive hover:bg-finance-positive/10 hover:text-finance-positive"
                    : "border-finance-negative/35 text-finance-negative hover:bg-finance-negative/10 hover:text-finance-negative"
                )}
                aria-label={type === "income" ? t("entries.addIncome") : t("entries.addExpense")}
              >
                <Plus className="h-4 w-4" />
                <span className="sm:hidden">{t("common.add")}</span>
                <span className="hidden sm:inline">
                  {type === "income" ? t("entries.addIncome") : t("entries.addExpense")}
                </span>
              </Button>
            )}
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Search Input */}
              {entries.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t("entries.searchEntries")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              )}

              {/* Entry List */}
              <ul className="space-y-1">
              {filteredEntries.map((entry) => (
                <li
                  key={entry.id}
                  ref={(el) => {
                    if (el) entryCardRefs.current.set(entry.id, el as unknown as HTMLDivElement);
                    else entryCardRefs.current.delete(entry.id);
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-lg border border-border px-3 py-2.5 cursor-pointer transition-colors",
                    "hover:border-primary/40 hover:bg-muted/40",
                    flashingEntries.has(entry.id) &&
                      (type === "income" ? "flash-success" : "flash-error")
                  )}
                  onClick={() => handleEntryClick(entry)}
                >
                  <div className="flex flex-col pr-2 max-w-[60%] sm:max-w-[70%]">
                    <span className="font-medium text-sm sm:text-base truncate">
                      <PrivacyText
                        value={
                          entry.description || t("entries.noDescription")
                        }
                      />
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 font-semibold text-sm sm:text-base transition-colors",
                        type === "income"
                          ? "text-finance-positive"
                          : "text-finance-negative"
                      )}
                    >
                      <PrivacyNumber
                          value={calculateTotal(entry.amounts)}
                      />
                      {entry.recurrent && <span className="ml-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 align-middle text-[10px] font-medium text-primary-contrast">{t("entries.recurrentBadge")}</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <TooltipProvider delayDuration={400}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              const index = getNextUnresolvedOccurrence(entry)?.monthIndex ?? -1;
                              if (index >= 0) handleResolveCurrentMonth(e, entry);
                            }}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8 p-0 touch-manipulation"
                            aria-label={t("entries.markCurrentMonth")}
                            disabled={
                              !entry.amounts.some(
                                 (amount, index) => amount && amount !== 0 && !entry.resolved?.[index] && !entry.dismissed?.[index]
                              )
                            }
                          >
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          {t("entries.markCurrentMonth")}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </li>
              ))}
              </ul>

              {filteredEntries.length === 0 && entries.length > 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {t("entries.noEntriesFound")} &quot;{searchQuery}&quot;
                </div>
              )}
              {!hideAddButton && (
                <Button
                  onClick={handleAddEntry}
                  variant="outline"
                  className={cn(
                    "w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] touch-manipulation py-3 sm:py-2",
                    type === "income"
                      ? "border-finance-positive/30 hover:bg-card"
                      : "border-finance-negative/30 hover:bg-card"
                  )}
                  aria-label={`${t("entries.add")} ${
                    type === "income"
                      ? t("entries.income")
                      : t("entries.expenses")
                  }`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {type === "income"
                    ? t("entries.addIncome")
                    : t("entries.addExpense")}
                </Button>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>

        {/* Resolve Value Confirmation Dialog */}
        <AlertDialog
          open={resolveDialogOpen}
          onOpenChange={setResolveDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {type === "income"
                  ? t("entries.markAsReceived")
                  : t("entries.markAsPaid")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {entryToResolve && (
                  <>
                    {t("entries.mark")}{" "}
                    <strong>
                      <PrivacyNumber value={entryToResolve.amount} />
                    </strong>{" "}
                    {t("entries.markFor")}{" "}
                    <strong>{rollingMonths[entryToResolve.monthIndex]}</strong>{" "}
                    {t("entries.as")}{" "}
                    {type === "income"
                      ? t("entries.received")
                      : t("entries.paid")}
                    ?
                    <br />
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEntryToResolve(null)}>
                {t("common.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmResolveCurrentMonth}
                className="bg-finance-positive text-primary-foreground hover:bg-finance-positive/70"
              >
                {t("common.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Guided Entry Dialog */}
        <GuidedEntryDialog
          open={guidedDialogOpen}
          onOpenChange={setGuidedDialogOpen}
          type={type}
          onSubmit={handleGuidedSubmit}
        />

        {/* Entry Edit Dialog */}
        <EntryEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          entry={selectedEntry}
          type={type}
          recurrent={Boolean(selectedEntry?.recurrent)}
          recurrenceAmount={selectedEntry?.recurrenceAmount || 0}
          onCommitRecurrence={async (recurrent, recurrenceAmount) => {
            if (!selectedEntry || !onCommitRecurrence) return false;
            return onCommitRecurrence(selectedEntry.id, recurrent, recurrenceAmount);
          }}
          onUpdateEntry={onUpdateEntry}
          onCommitDescription={onCommitDescription}
          onCommitAmount={onCommitAmount}
          onDeleteEntry={async (id) => {
            await onRemoveEntry(id);
          }}
          rollingMonths={rollingMonths}
        />
      </Card>
    );
  }
);

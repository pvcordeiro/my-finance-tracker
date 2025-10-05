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
import { EntryEditDialog } from "./entry-edit-dialog";
import { PrivacyNumber } from "@/components/ui/privacy-number";
import { PrivacyText } from "@/components/ui/privacy-text";

export interface FinanceEntry {
  id: string;
  description: string;
  amounts: number[];
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
    amount: number
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
  onGuidedAddEntry: (description: string, amounts: number[]) => void;
  flashEntryId?: string;
  flashToken?: number;
  hideAddButton?: boolean;
  guidedDialogOpen?: boolean;
  onGuidedDialogOpenChange?: (open: boolean) => void;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getRollingMonths(): string[] {
  const now = new Date();
  const currentMonth = now.getMonth();
  const months = [];

  for (let i = 0; i < 12; i++) {
    const monthIndex = (currentMonth + i) % 12;
    months.push(MONTHS[monthIndex]);
  }

  return months;
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
      guidedDialogOpen: externalGuidedDialogOpen,
      onGuidedDialogOpenChange,
    },
    ref
  ) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
    const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
    const [entryToResolve, setEntryToResolve] = useState<{
      entry: FinanceEntry;
      monthIndex: number;
      amount: number;
    } | null>(null);
    const [internalGuidedDialogOpen, setInternalGuidedDialogOpen] =
      useState(false);
    const [flashingEntries, setFlashingEntries] = useState<Set<string>>(
      new Set()
    );
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<FinanceEntry | null>(
      null
    );
    const [searchQuery, setSearchQuery] = useState("");

    const guidedDialogOpen =
      externalGuidedDialogOpen !== undefined
        ? externalGuidedDialogOpen
        : internalGuidedDialogOpen;
    const setGuidedDialogOpen =
      onGuidedDialogOpenChange || setInternalGuidedDialogOpen;

    const rollingMonths = getRollingMonths();
    const sectionRef = useRef<HTMLDivElement | null>(null);

    const filteredEntries = entries.filter((entry) =>
      entry.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
      if (flashEntryId && flashToken) {
        setFlashingEntries((prev) => new Set(prev).add(flashEntryId));
        setTimeout(() => {
          setFlashingEntries((prev) => {
            const ns = new Set(prev);
            ns.delete(flashEntryId);
            return ns;
          });
        }, 650);
      }
    }, [flashEntryId, flashToken, isOpen]);

    const calculateTotal = (amounts: number[]) => {
      return amounts.reduce((sum, amount) => sum + (amount || 0), 0);
    };

    const handleAddEntry = () => {
      if (!isOpen) {
        onToggle();
      }
      setGuidedDialogOpen(true);
    };

    const handleGuidedSubmit = (description: string, amounts: number[]) => {
      onGuidedAddEntry(description, amounts);
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
                window.pageYOffset;
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
      const currentMonthIndex = 0;
      const currentAmount = entry.amounts[currentMonthIndex] || 0;

      if (currentAmount === 0) {
        return;
      }

      setEntryToResolve({
        entry,
        monthIndex: currentMonthIndex,
        amount: currentAmount,
      });
      setResolveDialogOpen(true);
    };

    const confirmResolveCurrentMonth = async () => {
      if (!entryToResolve) return;

      await onResolveCurrentMonth(
        entryToResolve.entry.id,
        entryToResolve.monthIndex,
        entryToResolve.amount
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
          type === "income" ? "income-card" : "expense-card"
        )}
      >
        <Collapsible open={isOpen} onOpenChange={handleSectionToggle}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer touch-manipulation">
              <CardTitle
                className={cn(
                  "flex items-center justify-between text-lg sm:text-xl",
                  type === "income"
                    ? "text-finance-positive"
                    : "text-finance-negative"
                )}
              >
                <span>{title}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-semibold text-base sm:text-lg tracking-tight",
                      type === "income"
                        ? "text-finance-positive"
                        : "text-finance-negative"
                    )}
                  >
                    <PrivacyNumber
                      value={entries.reduce(
                        (sum, entry) => sum + calculateTotal(entry.amounts),
                        0
                      )}
                      prefix="€"
                    />
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 data-[state=open]:animate-in data-[state=open]:slide-in-from-top-5 data-[state=open]:fade-in-5 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-5 data-[state=closed]:fade-out-5">
            <CardContent className="space-y-4">
              {/* Search Input */}
              {entries.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search entries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              )}

              {/* Entry Cards */}
              {filteredEntries.map((entry) => (
                <Card
                  key={entry.id}
                  className={cn(
                    "border-muted cursor-pointer hover:border-primary/50 transition-all",
                    flashingEntries.has(entry.id) &&
                      (type === "income" ? "flash-success" : "flash-error")
                  )}
                  onClick={() => handleEntryClick(entry)}
                >
                  <CardHeader className="py-3 touch-manipulation">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col pr-2 max-w-[60%] sm:max-w-[70%]">
                        <span className="font-medium text-sm sm:text-base truncate">
                          <PrivacyText
                            value={entry.description || "(No description)"}
                          />
                        </span>
                        <span
                          className={cn(
                            "mt-1 font-semibold text-sm sm:text-base transition-colors",
                            type === "income"
                              ? "text-finance-positive"
                              : "text-finance-negative"
                          )}
                        >
                          <PrivacyNumber
                            value={calculateTotal(entry.amounts)}
                            prefix="€"
                          />
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleResolveCurrentMonth(e, entry)}
                          className="text-finance-positive hover:text-finance-positive hover:bg-finance-positive/10 h-8 w-8 p-0 touch-manipulation"
                          aria-label={`Mark current month as resolved: ${
                            entry.description || "unnamed entry"
                          }`}
                          disabled={!entry.amounts[0] || entry.amounts[0] === 0}
                        >
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}

              {filteredEntries.length === 0 && entries.length > 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No entries found matching &quot;{searchQuery}&quot;
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
                  aria-label={`Add new ${
                    type === "income" ? "income" : "expense"
                  } entry`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add {type === "income" ? "Income" : "Expense"}
                </Button>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
        {/* Delete Entry Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Entry</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this entry? This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (entryToDelete) {
                    try {
                      await onRemoveEntry(entryToDelete);

                      setEntryToDelete(null);
                    } catch (error) {
                      console.error("Failed to delete entry:", error);
                    }
                  }
                  setDeleteDialogOpen(false);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Entry
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Resolve Current Month Confirmation Dialog */}
        <AlertDialog
          open={resolveDialogOpen}
          onOpenChange={setResolveDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Mark as {type === "income" ? "Received" : "Paid"}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {entryToResolve && (
                  <>
                    Mark{" "}
                    <strong>
                      <PrivacyNumber value={entryToResolve.amount} prefix="€" />
                    </strong>{" "}
                    for{" "}
                    <strong>{rollingMonths[entryToResolve.monthIndex]}</strong>{" "}
                    as {type === "income" ? "received" : "paid"}?
                    <br />
                    This will clear the current month&apos;s value for &quot;
                    {entryToResolve.entry.description || "this entry"}&quot;.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEntryToResolve(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmResolveCurrentMonth}
                className="bg-finance-positive text-primary-foreground hover:bg-finance-positive/70"
              >
                Confirm
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

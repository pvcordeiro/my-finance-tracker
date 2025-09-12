"use client";
import { useState, useRef, useEffect } from "react";
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
import { ChevronDown, ChevronUp, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

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
  type: "income" | "expense";
  isOpen: boolean;
  onToggle: () => void;
  saveData: (a?: any, b?: any) => void;
  triggerSavedPopup: () => void;
  handleSessionExpired: () => void;
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

export function EntryForm({
  title,
  entries,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  type,
  isOpen,
  onToggle,
  saveData,
  triggerSavedPopup,
  handleSessionExpired,
}: EntryFormProps) {
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(
    new Set()
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const rollingMonths = getRollingMonths();
  const entryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const prevEntriesLengthRef = useRef(entries.length);
  const shouldExpandLastEntry = useRef(false);

  const toggleEntry = (entryId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
      setTimeout(() => {
        const entryElement = entryRefs.current[entryId];
        if (entryElement) {
          const rect = entryElement.getBoundingClientRect();
          const offset = 90;
          const isVisible =
            rect.top >= offset && rect.bottom <= window.innerHeight;
          if (!isVisible) {
            const elementTop =
              entryElement.getBoundingClientRect().top + window.pageYOffset;
            window.scrollTo({
              top: elementTop - offset,
              behavior: "smooth",
            });
          }
        }
      }, 200);
    }
    setExpandedEntries(newExpanded);
  };

  const calculateTotal = (amounts: number[]) => {
    return amounts.reduce((sum, amount) => sum + (amount || 0), 0);
  };

  const handleAddEntry = () => {
    if (!isOpen) {
      onToggle();
    }
    prevEntriesLengthRef.current = entries.length;
    shouldExpandLastEntry.current = true;
    onAddEntry();
  };

  const handleSectionToggle = () => {
    if (isOpen) {
      setExpandedEntries(new Set());
    } else {
      setTimeout(() => {
        if (sectionRef.current) {
          const elementTop =
            sectionRef.current.getBoundingClientRect().top + window.pageYOffset;
          window.scrollTo({
            top: elementTop - 90,
            behavior: "smooth",
          });
        }
      }, 200);
    }
    onToggle();
  };

  useEffect(() => {
    if (
      shouldExpandLastEntry.current &&
      entries.length > prevEntriesLengthRef.current
    ) {
      const newestEntry = entries[entries.length - 1];
      if (newestEntry) {
        setExpandedEntries((prev) => new Set([...prev, newestEntry.id]));
        setTimeout(() => {
          const entryElement = entryRefs.current[newestEntry.id];
          if (entryElement) {
            const elementTop =
              entryElement.getBoundingClientRect().top + window.pageYOffset;
            window.scrollTo({
              top: elementTop - 90,
              behavior: "smooth",
            });
          }
        }, 200);
      }
      shouldExpandLastEntry.current = false;
    }
    prevEntriesLengthRef.current = entries.length;
  }, [entries]);

  return (
    <Card
      ref={sectionRef}
      className={cn(
        "transition-all duration-200",
        type === "income" ? "income-card" : "expense-card"
      )}
    >
      <Collapsible open={isOpen} onOpenChange={handleSectionToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors active:bg-muted/70 touch-manipulation">
            <CardTitle
              className={cn(
                "flex items-center justify-between text-lg sm:text-xl",
                type === "income" ? "text-emerald-700" : "text-red-700"
              )}
            >
              <span>{title}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-normal text-muted-foreground">
                  €
                  {entries
                    .reduce(
                      (sum, entry) => sum + calculateTotal(entry.amounts),
                      0
                    )
                    .toFixed(2)}
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
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {entries.map((entry) => (
              <Card
                key={entry.id}
                className="border-muted"
                ref={(el) => {
                  if (el) {
                    entryRefs.current[entry.id] = el;
                  }
                }}
              >
                <Collapsible
                  open={expandedEntries.has(entry.id)}
                  onOpenChange={() => toggleEntry(entry.id)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3 active:bg-muted/50 touch-manipulation">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm sm:text-base truncate pr-2">
                          {entry.description || "(No description)"}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            €{calculateTotal(entry.amounts).toFixed(2)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEntryToDelete(entry.id);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 touch-manipulation"
                            aria-label={`Delete entry: ${
                              entry.description || "unnamed entry"
                            }`}
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          {expandedEntries.has(entry.id) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <Input
                        placeholder="Description"
                        value={entry.description}
                        onChange={(e) =>
                          onUpdateEntry(entry.id, "description", e.target.value)
                        }
                        onBlur={() => {
                          saveData(undefined, handleSessionExpired);
                          triggerSavedPopup();
                        }}
                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 text-sm sm:text-base"
                        aria-label={`Description for ${
                          entry.description || "new entry"
                        }`}
                      />
                      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
                        {rollingMonths.map((month, index) => (
                          <div key={month} className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground block">
                              {month}
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                                €
                              </span>
                              <Input
                                type="number"
                                inputMode="decimal"
                                placeholder="0"
                                value={entry.amounts[index] || ""}
                                onChange={(e) =>
                                  onUpdateEntry(
                                    entry.id,
                                    "amount",
                                    Number.parseFloat(e.target.value) || 0,
                                    index
                                  )
                                }
                                onBlur={() => {
                                  saveData(undefined, handleSessionExpired);
                                  triggerSavedPopup();
                                }}
                                className="pl-8 transition-all duration-200 focus:ring-2 focus:ring-primary/20 text-sm sm:text-base touch-manipulation"
                                aria-label={`Amount for ${month} in ${
                                  entry.description || "entry"
                                }`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
            <Button
              onClick={handleAddEntry}
              variant="outline"
              className={cn(
                "w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] touch-manipulation py-3 sm:py-2",
                type === "income"
                  ? "border-emerald-200 dark:border-emerald-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                  : "border-red-200 dark:border-red-700/50 hover:bg-red-50 dark:hover:bg-red-950/20"
              )}
              aria-label={`Add new ${
                type === "income" ? "income" : "expense"
              } entry`}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add {type === "income" ? "Income" : "Expense"}
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
      {/* Delete Entry Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this entry? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (entryToDelete) {
                  try {
                    await onRemoveEntry(entryToDelete);
                    // No need to call saveData since deletion is immediate via API
                    triggerSavedPopup();
                    setEntryToDelete(null);
                  } catch (error) {
                    console.error("Failed to delete entry:", error);
                    // You could show an error message to the user here
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
    </Card>
  );
}

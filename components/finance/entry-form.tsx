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
import { ChevronDown, ChevronUp, Trash2, Plus, Edit3 } from "lucide-react";
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
  onCommitDescription: (
    id: string,
    newDescription: string
  ) => Promise<boolean> | boolean;
  onCommitAmount: (
    id: string,
    monthIndex: number,
    amount: number
  ) => Promise<boolean> | boolean;
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
  onCommitDescription,
  onCommitAmount,
}: EntryFormProps) {
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(
    new Set()
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set());
  const [editingDescriptionId, setEditingDescriptionId] = useState<
    string | null
  >(null);
  const markSaved = (fieldKey: string) => {
    setSavedFields((prev) => new Set(prev).add(fieldKey));
    setTimeout(() => {
      setSavedFields((prev) => {
        const ns = new Set(prev);
        ns.delete(fieldKey);
        return ns;
      });
    }, 1300);
  };
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
                <span
                  className={cn(
                    "font-semibold text-base sm:text-lg tracking-tight",
                    type === "income"
                      ? "text-emerald-800 dark:text-emerald-400"
                      : "text-red-800 dark:text-red-400"
                  )}
                >
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
                        <div className="flex flex-col pr-2 max-w-[60%] sm:max-w-[70%]">
                          {editingDescriptionId === entry.id ? (
                            <Input
                              autoFocus
                              placeholder="Description"
                              value={entry.description}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                onUpdateEntry(
                                  entry.id,
                                  "description",
                                  e.target.value
                                );
                                setChangedFields((prev) =>
                                  new Set(prev).add(`${entry.id}-description`)
                                );
                              }}
                              onBlur={() => {
                                const fieldKey = `${entry.id}-description`;
                                if (changedFields.has(fieldKey)) {
                                  Promise.resolve(
                                    onCommitDescription(
                                      entry.id,
                                      entry.description
                                    )
                                  ).then((ok) => {
                                    if (ok) markSaved(fieldKey);
                                  });
                                  setChangedFields((prev) => {
                                    const ns = new Set(prev);
                                    ns.delete(fieldKey);
                                    return ns;
                                  });
                                }
                                setEditingDescriptionId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  (e.target as HTMLInputElement).blur();
                                } else if (e.key === "Escape") {
                                  // Cancel editing: revert pending change if not committed by reloading from changedFields? For simplicity just exit.
                                  e.preventDefault();
                                  setEditingDescriptionId(null);
                                }
                              }}
                              className={cn(
                                "transition-all duration-200 focus:ring-2 focus:ring-primary/20 text-sm sm:text-base h-8 py-1",
                                savedFields.has(`${entry.id}-description`) &&
                                  "flash-success"
                              )}
                              aria-label={`Edit description for ${
                                entry.description || "entry"
                              }`}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingDescriptionId(entry.id);
                              }}
                              className="group text-left flex items-center gap-2 font-medium text-sm sm:text-base truncate"
                              aria-label={`Edit description for ${
                                entry.description || "entry"
                              }`}
                            >
                              <span className="truncate">
                                {entry.description || "(No description)"}
                              </span>
                              <Edit3 className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )}
                          <span
                            className={cn(
                              "mt-1 font-semibold text-sm sm:text-base transition-colors",
                              type === "income"
                                ? "text-emerald-800 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            )}
                          >
                            €{calculateTotal(entry.amounts).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
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
                                onChange={(e) => {
                                  onUpdateEntry(
                                    entry.id,
                                    "amount",
                                    Number.parseFloat(e.target.value) || 0,
                                    index
                                  );
                                  setChangedFields((prev) =>
                                    new Set(prev).add(
                                      `${entry.id}-amount-${index}`
                                    )
                                  );
                                }}
                                onBlur={() => {
                                  const fieldKey = `${entry.id}-amount-${index}`;
                                  if (changedFields.has(fieldKey)) {
                                    Promise.resolve(
                                      onCommitAmount(
                                        entry.id,
                                        index,
                                        entry.amounts[index] || 0
                                      )
                                    ).then((ok) => {
                                      if (ok) markSaved(fieldKey);
                                    });
                                    setChangedFields((prev) => {
                                      const ns = new Set(prev);
                                      ns.delete(fieldKey);
                                      return ns;
                                    });
                                  }
                                }}
                                className={cn(
                                  "pl-8 transition-all duration-200 focus:ring-2 focus:ring-primary/20 text-sm sm:text-base touch-manipulation",
                                  savedFields.has(
                                    `${entry.id}-amount-${index}`
                                  ) && "flash-success"
                                )}
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

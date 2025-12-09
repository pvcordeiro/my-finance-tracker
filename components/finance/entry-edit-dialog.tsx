"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { PrivacyNumber } from "@/components/ui/privacy-number";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

interface FinanceEntry {
  id: string;
  description: string;
  amounts: number[];
}

interface EntryEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: FinanceEntry | null;
  type: "income" | "expense";
  onUpdateEntry: (
    id: string,
    field: string,
    value: string | number,
    monthIndex?: number
  ) => void;
  onCommitDescription: (
    id: string,
    newDescription: string
  ) => Promise<boolean> | boolean;
  onCommitAmount: (
    id: string,
    monthIndex: number,
    amount: number
  ) => Promise<boolean> | boolean;
  onDeleteEntry: (id: string) => Promise<void>;
  rollingMonths: string[];
}

export function EntryEditDialog({
  open,
  onOpenChange,
  entry,
  type,
  onUpdateEntry,
  onCommitDescription,
  onCommitAmount,
  onDeleteEntry,
  rollingMonths,
}: EntryEditDialogProps) {
  const { currencySymbol, t } = useLanguage();
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set());
  const [localEntry, setLocalEntry] = useState<FinanceEntry | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const descriptionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (entry) {
      setLocalEntry({ ...entry, amounts: [...entry.amounts] });
    }
  }, [entry, open]);

  useEffect(() => {
    if (open && descriptionInputRef.current) {
      setTimeout(() => {
        descriptionInputRef.current?.focus();
        descriptionInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300);
    }
  }, [open]);

  useEffect(() => {
    if (!open && changedFields.size > 0 && localEntry) {
      changedFields.forEach((fieldKey) => {
        if (fieldKey.includes("-description")) {
          Promise.resolve(
            onCommitDescription(localEntry.id, localEntry.description)
          );
        } else if (fieldKey.includes("-amount-")) {
          const index = parseInt(fieldKey.split("-amount-")[1]);
          Promise.resolve(
            onCommitAmount(localEntry.id, index, localEntry.amounts[index] || 0)
          );
        }
      });
      setChangedFields(new Set());
    }
  }, [open, changedFields, localEntry, onCommitDescription, onCommitAmount]);

  const markSaved = (fieldKey: string) => {
    setSavedFields((prev) => new Set(prev).add(fieldKey));
    setTimeout(() => {
      setSavedFields((prev) => {
        const ns = new Set(prev);
        ns.delete(fieldKey);
        return ns;
      });
    }, 750);
  };

  if (!localEntry) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto flex flex-col">
          <DialogHeader className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteDialogOpen(true)}
              className="absolute left-0 top-0 text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
              aria-label="Delete entry"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <DialogTitle className="text-center">
              {type === "income"
                ? t("entries.editIncome")
                : t("entries.editExpense")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4 px-1 pb-1 flex-1 overflow-y-auto">
            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("entries.description")}
              </label>
              <Input
                ref={descriptionInputRef}
                placeholder={t("entries.description")}
                value={localEntry.description}
                onChange={(e) => {
                  const newDescription = e.target.value;
                  setLocalEntry({ ...localEntry, description: newDescription });
                  onUpdateEntry(localEntry.id, "description", newDescription);
                  setChangedFields((prev) =>
                    new Set(prev).add(`${localEntry.id}-description`)
                  );
                }}
                onBlur={() => {
                  const fieldKey = `${localEntry.id}-description`;
                  if (changedFields.has(fieldKey)) {
                    Promise.resolve(
                      onCommitDescription(localEntry.id, localEntry.description)
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
                onFocus={(e) => {
                  setTimeout(() => {
                    e.target.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }, 300);
                }}
                className={cn(
                  "transition-all duration-200",
                  savedFields.has(`${localEntry.id}-description`) &&
                    "flash-success"
                )}
              />
            </div>

            {/* Monthly Amounts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  {t("entries.monthlyAmounts")}
                </label>
                <span
                  className={cn(
                    "font-semibold text-base",
                    type === "income"
                      ? "text-finance-positive"
                      : "text-finance-negative"
                  )}
                >
                  <PrivacyNumber
                    value={localEntry.amounts.reduce(
                      (sum, amount) => sum + (amount || 0),
                      0
                    )}
                  />
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {rollingMonths.map((month, index) => (
                  <div key={month} className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground block">
                      {month}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                        {currencySymbol}
                      </span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="0"
                        value={localEntry.amounts[index] || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          const regex = /^\d*\.?\d{0,2}$/;
                          if (value === "" || regex.test(value)) {
                            const newAmount = Number.parseFloat(value) || 0;
                            const newAmounts = [...localEntry.amounts];
                            newAmounts[index] = newAmount;
                            setLocalEntry({
                              ...localEntry,
                              amounts: newAmounts,
                            });
                            onUpdateEntry(
                              localEntry.id,
                              "amount",
                              newAmount,
                              index
                            );
                            setChangedFields((prev) =>
                              new Set(prev).add(
                                `${localEntry.id}-amount-${index}`
                              )
                            );
                          }
                        }}
                        onBlur={() => {
                          const fieldKey = `${localEntry.id}-amount-${index}`;
                          if (changedFields.has(fieldKey)) {
                            Promise.resolve(
                              onCommitAmount(
                                localEntry.id,
                                index,
                                localEntry.amounts[index] || 0
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
                        onFocus={(e) => {
                          setTimeout(() => {
                            e.target.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                          }, 300);
                        }}
                        className={cn(
                          "pl-8 transition-all duration-200",
                          savedFields.has(`${localEntry.id}-amount-${index}`) &&
                            "flash-success"
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("entries.deleteEntry")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("entries.deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await onDeleteEntry(localEntry.id);
                setDeleteDialogOpen(false);
                onOpenChange(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("entries.deleteEntry")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

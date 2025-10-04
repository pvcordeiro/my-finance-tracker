"use client";
import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface GuidedEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "income" | "expense";
  onSubmit: (description: string, amounts: number[]) => void;
}

export function GuidedEntryDialog({
  open,
  onOpenChange,
  type,
  onSubmit,
}: GuidedEntryDialogProps) {
  const [step, setStep] = useState<"description" | "type" | "amounts">(
    "description"
  );
  const [description, setDescription] = useState("");
  const [isFixed, setIsFixed] = useState(true);
  const [fixedAmount, setFixedAmount] = useState("");
  const [amounts, setAmounts] = useState<string[]>(Array(12).fill(""));
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const months = getRollingMonths();

  useEffect(() => {
    if (open) {
      setStep("description");
      setDescription("");
      setIsFixed(true);
      setFixedAmount("");
      setAmounts(Array(12).fill(""));
      setCurrentMonthIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [step, open, currentMonthIndex]);

  const handleNext = () => {
    if (step === "description") {
      if (!description.trim()) return;
      setStep("type");
    } else if (step === "type") {
      setStep("amounts");
      if (isFixed) {
        setCurrentMonthIndex(0);
      } else {
        setCurrentMonthIndex(0);
      }
    }
  };

  const handleBack = () => {
    if (step === "amounts") {
      if (!isFixed && currentMonthIndex > 0) {
        setCurrentMonthIndex(currentMonthIndex - 1);
      } else {
        setStep("type");
      }
    } else if (step === "type") {
      setStep("description");
    }
  };

  const handleNextMonth = () => {
    if (isFixed) {
      handleComplete();
    } else {
      if (currentMonthIndex < 11) {
        const newAmounts = [...amounts];
        newAmounts[currentMonthIndex] = amounts[currentMonthIndex] || "0";
        setAmounts(newAmounts);
        setCurrentMonthIndex(currentMonthIndex + 1);
      } else {
        handleComplete();
      }
    }
  };

  const handleComplete = () => {
    let finalAmounts: number[];

    if (isFixed) {
      const amount = parseFloat(fixedAmount) || 0;
      finalAmounts = Array(12).fill(amount);
    } else {
      finalAmounts = amounts.map((a) => parseFloat(a) || 0);
    }

    onSubmit(description, finalAmounts);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (step === "description" && description.trim()) {
        handleNext();
      } else if (step === "type") {
        handleNext();
      } else if (step === "amounts") {
        handleNextMonth();
      }
    }
  };

  const canProceed = () => {
    if (step === "description") return description.trim() !== "";
    if (step === "type") return true;
    if (step === "amounts") {
      if (isFixed) return fixedAmount !== "";
      return true;
    }
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <span
              className={cn(
                type === "income"
                  ? "text-finance-positive"
                  : "text-finance-negative"
              )}
            >
              Add {type === "income" ? "Income" : "Expense"}
            </span>
            <Badge variant="outline" className="ml-auto">
              Step {step === "description" ? "1" : step === "type" ? "2" : "3"}{" "}
              of 3
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {step === "description" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  ref={inputRef}
                  id="description"
                  placeholder="e.g., Monthly Salary, Rent, Electricity..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="text-base"
                />
              </div>
            </div>
          )}

          {step === "type" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="fixed-toggle" className="text-base">
                    Fixed amount for all months
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Same value will be applied to all 12 months
                  </p>
                </div>
                <Switch
                  id="fixed-toggle"
                  checked={isFixed}
                  onCheckedChange={setIsFixed}
                />
              </div>
              <div className="text-sm text-muted-foreground text-center">
                {isFixed
                  ? "You'll enter one amount for all months"
                  : "You'll enter amounts month by month"}
              </div>
            </div>
          )}

          {step === "amounts" && (
            <div className="space-y-4">
              {isFixed ? (
                <div className="space-y-2">
                  <Label htmlFor="fixed-amount" className="text-base">
                    Amount (€)
                  </Label>
                  <Input
                    ref={inputRef}
                    id="fixed-amount"
                    type="number"
                    step="0.01"
                    placeholder=""
                    value={fixedAmount}
                    onChange={(e) => {
                      const value = e.target.value;

                      const regex = /^\d*\.?\d{0,2}$/;
                      if (value === "" || regex.test(value)) {
                        setFixedAmount(value);
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    className="text-2xl font-semibold text-center"
                  />
                  <p className="text-sm text-muted-foreground text-center">
                    This amount will be applied to all 12 months
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-base px-3 py-1">
                      {months[currentMonthIndex]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Month {currentMonthIndex + 1} of 12
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="variable-amount"
                      className="text-base flex items-center justify-between"
                    >
                      <span>Amount (€)</span>
                      {currentMonthIndex > 0 && (
                        <span className="text-xs text-muted-foreground font-normal">
                          Leave empty for €0.00
                        </span>
                      )}
                    </Label>
                    <Input
                      ref={inputRef}
                      id="variable-amount"
                      type="number"
                      step="0.01"
                      placeholder=""
                      value={amounts[currentMonthIndex]}
                      onChange={(e) => {
                        const value = e.target.value;

                        const regex = /^\d*\.?\d{0,2}$/;
                        if (value === "" || regex.test(value)) {
                          const newAmounts = [...amounts];
                          newAmounts[currentMonthIndex] = value;
                          setAmounts(newAmounts);
                        }
                      }}
                      onKeyDown={handleKeyDown}
                      className="text-2xl font-semibold text-center"
                    />
                  </div>
                  {/* Progress indicator */}
                  <div className="flex gap-1 pt-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-colors",
                          i < currentMonthIndex
                            ? "bg-primary"
                            : i === currentMonthIndex
                            ? "bg-primary/50"
                            : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          {(step === "type" || step === "amounts") && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="flex-1 sm:flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          {step !== "amounts" ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1 sm:flex-1"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleNextMonth}
              disabled={!canProceed()}
              className="flex-1 sm:flex-1"
            >
              {isFixed ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Complete
                </>
              ) : currentMonthIndex < 11 ? (
                <>
                  Next Month
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Complete
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

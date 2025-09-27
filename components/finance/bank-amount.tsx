"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Banknote } from "lucide-react";

interface BankAmountProps {
  amount: number;
  onChange: (amount: number) => void;
  onBlur: () => void;
  flashToken?: number;
}

export function BankAmount({
  amount,
  onChange,
  onBlur,
  flashToken,
}: BankAmountProps) {
  const [hasChanged, setHasChanged] = useState(false);
  const [originalValue, setOriginalValue] = useState(amount);
  const [flashActive, setFlashActive] = useState(false);

  useEffect(() => {
    if (flashToken !== undefined) {
      setFlashActive(false);
      const t = setTimeout(() => setFlashActive(true), 10);
      return () => clearTimeout(t);
    }
  }, [flashToken]);

  const handleFocus = () => {
    setOriginalValue(amount);
    setHasChanged(false);
  };

  const handleChange = (value: number) => {
    onChange(value);
    setHasChanged(true);
  };

  const handleBlur = () => {
    if (hasChanged && amount !== originalValue) {
      onBlur();
    }
    setHasChanged(false);
  };
  return (
    <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
            <Label
              htmlFor="bankAmount"
              className="font-semibold text-primary text-sm sm:text-base"
            >
              Current Bank Balance:
            </Label>
          </div>
          <div className="relative w-full sm:w-auto">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none z-10 select-none">
              €
            </span>
            <Input
              id="bankAmount"
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={amount || ""}
              onChange={(e) =>
                handleChange(Number.parseFloat(e.target.value) || 0)
              }
              onFocus={handleFocus}
              onBlur={handleBlur}
              className={`pl-8 w-full sm:w-32 transition-all duration-200 focus:ring-2 focus:ring-primary/20 text-sm sm:text-base touch-manipulation ${
                flashActive ? "flash-success" : ""
              }`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

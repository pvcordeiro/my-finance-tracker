"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Banknote, Plus, Minus } from "lucide-react";
import { PrivacyNumber } from "@/components/ui/privacy-number";

interface BankAmountProps {
  amount: number;
  onAdd: (delta: number, note?: string) => void;
  onSubtract: (delta: number, note?: string) => void;
  flashToken?: number;
  flashType?: "add" | "subtract";
}

export function BankAmount({
  amount,
  onAdd,
  onSubtract,
  flashToken,
  flashType,
}: BankAmountProps) {
  const [inputValue, setInputValue] = useState<number>(0);
  const [note, setNote] = useState<string>("");
  const [flashActive, setFlashActive] = useState(false);
  const [currentFlashType, setCurrentFlashType] = useState<"add" | "subtract">(
    "add"
  );
  const [noteFieldEnabled, setNoteFieldEnabled] = useState(false);

  useEffect(() => {
    const fetchSetting = async () => {
      try {
        const response = await fetch("/api/balance-history", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setNoteFieldEnabled(data.enabled || false);
        }
      } catch (error) {
        console.error("Failed to fetch note field setting:", error);
      }
    };

    fetchSetting();
  }, []);

  useEffect(() => {
    if (flashToken !== undefined) {
      setFlashActive(false);
      if (flashType) {
        setCurrentFlashType(flashType);
      }
      const t = setTimeout(() => setFlashActive(true), 10);
      const clearT = setTimeout(() => setFlashActive(false), 660);
      return () => {
        clearTimeout(t);
        clearTimeout(clearT);
      };
    }
  }, [flashToken, flashType]);
  const handleInputChange = (value: number) => {
    setInputValue(value);
  };
  const handleAdd = () => {
    if (!isNaN(inputValue) && inputValue !== 0) {
      onAdd(inputValue, note || undefined);
      setInputValue(0);
      setNote("");
    }
  };
  const handleSubtract = () => {
    if (!isNaN(inputValue) && inputValue !== 0) {
      onSubtract(inputValue, note || undefined);
      setInputValue(0);
      setNote("");
    }
  };
  return (
    <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <Banknote className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
            <div className="flex flex-col gap-1">
              <Label className="font-semibold text-primary text-sm sm:text-base">
                Current Balance
              </Label>
              <span
                className={`text-2xl sm:text-3xl font-bold text-primary transition-all duration-300 ${
                  flashActive
                    ? currentFlashType === "add"
                      ? "flash-success"
                      : "flash-error"
                    : ""
                }`}
              >
                <PrivacyNumber
                  value={amount}
                  className="text-2xl sm:text-3xl font-bold"
                  prefix="€ "
                  format={(val) => val.toFixed(2)}
                />
              </span>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-3 block">
              Adjust Balance
            </Label>
            <div className="flex flex-col gap-3">
              <div
                className={`grid gap-3 ${
                  noteFieldEnabled
                    ? "grid-cols-1 sm:grid-cols-2"
                    : "grid-cols-1"
                }`}
              >
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none z-10 select-none">
                    €
                  </span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="Enter amount"
                    value={inputValue === 0 ? "" : inputValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      const regex = /^\d*\.?\d{0,2}$/;
                      if (value === "" || regex.test(value)) {
                        handleInputChange(Number.parseFloat(value) || 0);
                      }
                    }}
                    className="pl-8 w-full text-sm sm:text-base"
                  />
                </div>
                {noteFieldEnabled && (
                  <Input
                    type="text"
                    placeholder="Add note (optional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full text-sm sm:text-base"
                    maxLength={200}
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className="w-full border-finance-positive text-finance-positive hover:bg-card"
                  onClick={handleAdd}
                  disabled={!inputValue || inputValue <= 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className="w-full border-finance-negative text-finance-negative hover:bg-card"
                  onClick={handleSubtract}
                  disabled={!inputValue || inputValue <= 0}
                >
                  <Minus className="w-4 h-4 mr-2" />
                  Subtract
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

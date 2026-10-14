"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { CurrencyAmountInput } from "@/components/ui/currency-amount-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Banknote, Plus, Minus } from "lucide-react";
import { PrivacyNumber } from "@/components/ui/privacy-number";
import { useLanguage } from "@/hooks/use-language";

interface BankAmountProps {
  "data-tour"?: string;
  tourReadOnly?: boolean;
  readOnly?: boolean;
  amount: number;
  onAdd: (delta: number, note?: string) => void;
  onSubtract: (delta: number, note?: string) => void;
  flashToken?: number;
  flashType?: "add" | "subtract";
}

export function BankAmount({
  "data-tour": dataTour,
  tourReadOnly = false,
  readOnly = false,
  amount,
  onAdd,
  onSubtract,
  flashToken,
  flashType,
}: BankAmountProps) {
  const { currencySymbol, t } = useLanguage();
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
    <Card data-tour={dataTour} className="bg-primary/5 border-primary/20">
      <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-6">
          <div>
            <div className="flex flex-col gap-0.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-primary-contrast">
                {t("dashboard.currentBalance")}
              </Label>
              <div className="flex items-center gap-3">
                <span
                  className={`text-3xl sm:text-4xl font-bold text-primary-contrast transition-all duration-300 ${
                    flashActive
                      ? currentFlashType === "add"
                        ? "flash-success"
                        : "flash-error"
                      : ""
                  }`}
                >
                  <PrivacyNumber
                    value={amount}
                    className="text-3xl sm:text-4xl font-bold"
                  />
                </span>
                <Banknote className="h-5 w-5 shrink-0 text-primary-contrast/80" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-3 block">
              {t("dashboard.adjustBalance")}
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
                  <CurrencyAmountInput
                    currencySymbol={currencySymbol}
                    type="number"
                    value={inputValue || ""}
                    onChange={(e) =>
                      setInputValue(parseFloat(e.target.value) || 0)
                    }
                    className="text-lg h-10"
                    placeholder="0.00"
                    disabled={readOnly || tourReadOnly}
                  />
                </div>
                {noteFieldEnabled && (
                  <Input
                    type="text"
                    placeholder={t("dashboard.addNote")}
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
                  className="w-full border-finance-positive text-finance-positive hover:bg-card active:scale-[0.98] transition-transform"
                  onClick={handleAdd}
                    disabled={readOnly || tourReadOnly || !inputValue || inputValue <= 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t("common.add")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className="w-full border-finance-negative text-finance-negative hover:bg-card active:scale-[0.98] transition-transform"
                  onClick={handleSubtract}
                    disabled={readOnly || tourReadOnly || !inputValue || inputValue <= 0}
                >
                  <Minus className="w-4 h-4 mr-2" />
                  {t("dashboard.subtract")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

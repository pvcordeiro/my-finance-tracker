"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageCurrencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: string;
  currency: string;
  onLanguageChange: (lang: "en" | "pt") => void;
  onCurrencyChange: (curr: "EUR" | "USD" | "BRL") => void;
  t?: (key: string) => string;
}

export function LanguageCurrencyDialog({
  open,
  onOpenChange,
  language,
  currency,
  onLanguageChange,
  onCurrencyChange,
  t = (key: string) => {
    const translations: Record<string, string> = {
      "settings.languageAndCurrency": "Language & Currency",
      "auth.language": "Language",
      "auth.currency": "Currency",
      "common.done": "Done",
    };
    return translations[key] || key;
  },
}: LanguageCurrencyDialogProps) {
  const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "pt", name: "Português", flag: "🇧🇷" },
  ];

  const currencies = [
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "BRL", name: "Real", symbol: "R$" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("settings.languageAndCurrency")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Language Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              {t("auth.language")}
            </Label>
            <div className="grid gap-2">
              {languages.map((lang) => (
                <Button
                  key={lang.code}
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start h-auto py-3 px-4 text-left focus-visible:ring-0 focus-visible:ring-offset-0",
                    language === lang.code
                      ? "border-primary bg-primary/5 hover:bg-primary/10"
                      : "focus-visible:border-input"
                  )}
                  onClick={() => onLanguageChange(lang.code as "en" | "pt")}
                >
                  <span className="text-2xl mr-3">{lang.flag}</span>
                  <span className="flex-1 font-medium">{lang.name}</span>
                  {language === lang.code && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Currency Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              {t("auth.currency")}
            </Label>
            <div className="grid gap-2">
              {currencies.map((curr) => (
                <Button
                  key={curr.code}
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start h-auto py-3 px-4 text-left focus-visible:ring-0 focus-visible:ring-offset-0",
                    currency === curr.code
                      ? "border-primary bg-primary/5 hover:bg-primary/10"
                      : "focus-visible:border-input"
                  )}
                  onClick={() =>
                    onCurrencyChange(curr.code as "EUR" | "USD" | "BRL")
                  }
                >
                  <span className="text-xl font-bold mr-3 w-8">
                    {curr.symbol}
                  </span>
                  <span className="flex-1 font-medium">{curr.name}</span>
                  {currency === curr.code && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            {t("common.done")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

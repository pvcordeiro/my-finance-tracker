"use client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { currencies, type CurrencyCode } from "@/lib/i18n";
import { LanguageFlag } from "@/components/ui/language-flag";

interface LanguageCurrencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: string;
  currency: CurrencyCode;
  onLanguageChange: (lang: "en" | "pt") => void;
  onCurrencyChange: (curr: CurrencyCode) => void;
  continueLabel?: string;
  onContinue?: () => void;
  hideCloseButton?: boolean;
  t?: (key: string) => string;
}

export function LanguageCurrencyDialog({
  open,
  onOpenChange,
  language,
  currency,
  onLanguageChange,
  onCurrencyChange,
  continueLabel,
  onContinue,
  hideCloseButton = true,
  t = (key: string) => {
    const translations: Record<string, string> = {
      "settings.languageAndCurrency": "Language & Currency",
      "auth.language": "Language",
      "auth.currency": "Currency",
    };
    return translations[key] || key;
  },
}: LanguageCurrencyDialogProps) {
  const languages = [
    { code: "en", name: "English" },
    { code: "pt", name: "Português" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[425px] max-h-[85dvh] overflow-y-auto"
        hideCloseButton={hideCloseButton}
        onEscapeKeyDown={hideCloseButton ? (event) => event.preventDefault() : undefined}
        onPointerDownOutside={hideCloseButton ? (event) => event.preventDefault() : undefined}
      >
        <DialogTitle className="sr-only">
          {t("settings.languageAndCurrency")}
        </DialogTitle>
        <div className="space-y-6">
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
                  <LanguageFlag language={lang.code} className="mr-3 h-8 w-12" />
                  <span className="flex-1 font-medium">{lang.name}</span>
                  {language === lang.code && (
                      <Check className="w-5 h-5 text-primary-contrast" />
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
                    onCurrencyChange(curr.code)
                  }
                >
                  <span className="text-base font-bold mr-3 w-12">
                    {curr.symbol}
                  </span>
                  <span className="flex-1 font-medium">
                    {t(`auth.currency${
                      {
                        EUR: "Euro",
                        USD: "UsDollar",
                        BRL: "BrazilianReal",
                        GBP: "BritishPound",
                        CAD: "CanadianDollar",
                        AUD: "AustralianDollar",
                        JPY: "JapaneseYen",
                        CHF: "SwissFranc",
                        INR: "IndianRupee",
                        CNY: "ChineseYuan",
                        MXN: "MexicanPeso",
                      }[curr.code]
                    }`)}
                  </span>
                  {currency === curr.code && (
                      <Check className="w-5 h-5 text-primary-contrast" />
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {continueLabel && onContinue && (
          <DialogFooter>
            <Button type="button" onClick={onContinue}>
              {continueLabel}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

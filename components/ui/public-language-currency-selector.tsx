"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { currencies } from "@/lib/i18n";
import { useLanguage } from "@/hooks/use-language";

interface PublicLanguageCurrencySelectorProps {
  language: string;
  currency: string;
  onLanguageChange: (lang: string) => void;
  onCurrencyChange: (curr: string) => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function PublicLanguageCurrencySelector({
  language,
  currency,
  onLanguageChange,
  onCurrencyChange,
  variant = "outline",
  size = "sm",
}: PublicLanguageCurrencySelectorProps) {
  const { t } = useLanguage();
  const getCurrencySymbol = (curr: string) =>
    currencies.find((item) => item.code === curr)?.symbol || "€";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className="flex items-center gap-2"
        >
          <span className="text-lg">{language === "pt" ? "🇧🇷" : "🇺🇸"}</span>
          <span className="font-semibold">{getCurrencySymbol(currency)}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs">Language</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => onLanguageChange("en")}
          className="flex items-center gap-2"
        >
          <span className="text-lg">🇺🇸</span>
          <span>English</span>
          {language === "en" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onLanguageChange("pt")}
          className="flex items-center gap-2"
        >
          <span className="text-lg">🇧🇷</span>
          <span>Português</span>
          {language === "pt" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs">Currency</DropdownMenuLabel>
        {currencies.map((item) => (
          <DropdownMenuItem
            key={item.code}
            onClick={() => onCurrencyChange(item.code)}
            className="flex items-center gap-2"
          >
            <span className="w-8 font-semibold">{item.symbol}</span>
            <span>{t(`auth.currency${
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
              }[item.code]
            }`)}</span>
            {currency === item.code && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

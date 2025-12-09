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
  const getCurrencySymbol = (curr: string) => {
    switch (curr) {
      case "USD":
        return "$";
      case "EUR":
        return "€";
      case "BRL":
        return "R$";
      default:
        return "€";
    }
  };

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
        <DropdownMenuItem
          onClick={() => onCurrencyChange("USD")}
          className="flex items-center gap-2"
        >
          <span className="font-semibold">$</span>
          <span>US Dollar</span>
          {currency === "USD" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onCurrencyChange("EUR")}
          className="flex items-center gap-2"
        >
          <span className="font-semibold">€</span>
          <span>Euro</span>
          {currency === "EUR" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onCurrencyChange("BRL")}
          className="flex items-center gap-2"
        >
          <span className="font-semibold">R$</span>
          <span>Real</span>
          {currency === "BRL" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

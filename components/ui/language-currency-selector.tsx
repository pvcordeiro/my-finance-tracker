"use client";
import { useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { LanguageCurrencyDialog } from "./language-currency-dialog";

interface LanguageCurrencySelectorProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showInDropdown?: boolean;
  onOpenDialog?: () => void;
}

export function LanguageCurrencySelector({
  variant = "outline",
  size = "sm",
  showInDropdown = false,
  onOpenDialog,
}: LanguageCurrencySelectorProps) {
  const { language, currency, currencySymbol, t, setLanguage, setCurrency } =
    useLanguage();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenDialog = () => {
    if (onOpenDialog) {
      onOpenDialog();
    } else {
      setDialogOpen(true);
    }
  };

  if (showInDropdown) {
    return (
      <>
        <Globe className="w-4 h-4 mr-2" />
        {t("settings.languageAndCurrency")}
      </>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className="flex items-center gap-2"
        onClick={handleOpenDialog}
      >
        <span className="text-lg">{language === "pt" ? "🇧🇷" : "🇺🇸"}</span>
        <span className="font-semibold">{currencySymbol}</span>
      </Button>

      <LanguageCurrencyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        language={language}
        currency={currency}
        onLanguageChange={setLanguage}
        onCurrencyChange={setCurrency}
        t={t}
      />
    </>
  );
}

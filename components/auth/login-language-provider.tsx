"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { translations, currencies } from "@/lib/i18n";

type Language = "en" | "pt";
type Currency = "EUR" | "USD" | "BRL";

interface LoginLanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  t: (key: string) => string;
  formatCurrency: (amount: number) => string;
  currencySymbol: string;
}

const LoginLanguageContext = createContext<
  LoginLanguageContextType | undefined
>(undefined);

export function LoginLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  const [currency, setCurrency] = useState<Currency>("EUR");

  const t = (path: string): string => {
    const keys = path.split(".");
    let current: Record<string, unknown> | string = translations[language];

    for (const key of keys) {
      if (typeof current === "string" || current[key] === undefined) {
        console.warn(
          `Translation missing for key: ${path} in language: ${language}`
        );
        return path;
      }
      current = current[key] as Record<string, unknown> | string;
    }

    return typeof current === "string" ? current : path;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === "pt" ? "pt-BR" : "en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getCurrencySymbol = () => {
    const currencyConfig = currencies.find((c) => c.code === currency);
    return currencyConfig?.symbol || "€";
  };

  return (
    <LoginLanguageContext.Provider
      value={{
        language,
        setLanguage,
        currency,
        setCurrency,
        t,
        formatCurrency,
        currencySymbol: getCurrencySymbol(),
      }}
    >
      {children}
    </LoginLanguageContext.Provider>
  );
}

export function useLoginLanguage() {
  const context = useContext(LoginLanguageContext);
  if (context === undefined) {
    throw new Error(
      "useLoginLanguage must be used within a LoginLanguageProvider"
    );
  }
  return context;
}

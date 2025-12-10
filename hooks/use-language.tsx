"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { translations, languages, currencies } from "@/lib/i18n";

type Language = keyof typeof translations;
type Currency = "EUR" | "USD" | "BRL";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  t: (key: string) => string;
  formatCurrency: (amount: number) => string;
  currencySymbol: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [currency, setCurrencyState] = useState<Currency>("EUR");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language");
    const savedCurrency = localStorage.getItem("currency");

    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "pt")) {
      setLanguageState(savedLanguage as Language);
    }
    if (savedCurrency && ["EUR", "USD", "BRL"].includes(savedCurrency)) {
      setCurrencyState(savedCurrency as Currency);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    if (lang !== "en" && lang !== "pt") {
      console.warn(`Invalid language: ${lang}. Defaulting to "en".`);
      return;
    }
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const setCurrency = (curr: Currency) => {
    if (!["EUR", "USD", "BRL"].includes(curr)) {
      console.warn(`Invalid currency: ${curr}. Defaulting to "EUR".`);
      return;
    }
    setCurrencyState(curr);
    localStorage.setItem("currency", curr);
  };

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

  const currencySymbol =
    currencies.find((c) => c.code === currency)?.symbol || "€";

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        currency,
        setCurrency,
        t,
        formatCurrency,
        currencySymbol,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { translations, currencies, currencyCodes, type CurrencyCode } from "@/lib/i18n";
import { languageFromLocale } from "@/lib/language";
import { useAuth } from "@/hooks/use-auth";

type Language = keyof typeof translations;
type Currency = CurrencyCode;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  saveAccountPreferences: () => Promise<boolean>;
  t: (key: string) => string;
  formatCurrency: (amount: number) => string;
  currencySymbol: string;
  currencyFractionDigits: number;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>("en");
  const [currency, setCurrencyState] = useState<Currency>("EUR");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language");
    const savedCurrency = localStorage.getItem("currency");
    const manuallySelectedLanguage =
      localStorage.getItem("language-manually-selected") === "true";

    if (
      manuallySelectedLanguage &&
      savedLanguage &&
      (savedLanguage === "en" || savedLanguage === "pt")
    ) {
      setLanguageState(savedLanguage as Language);
    } else {
      setLanguageState(languageFromLocale(navigator.language));
    }
    if (savedCurrency && currencyCodes.includes(savedCurrency as Currency)) {
      setCurrencyState(savedCurrency as Currency);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    if (user.language === "en" || user.language === "pt") {
      setLanguageState(user.language);
      localStorage.setItem("language", user.language);
    }
    if (user.currency && currencyCodes.includes(user.currency as Currency)) {
      setCurrencyState(user.currency as Currency);
      localStorage.setItem("currency", user.currency);
    }
  }, [user?.id, user?.language, user?.currency]);

  const persistAccountPreferences = async (preferences: Record<string, string>) => {
    if (!user) return false;
    try {
      const response = await fetch("/api/user/language-currency", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(preferences),
      });
      if (!response.ok) throw new Error("Unable to save account preferences");
      return true;
    } catch (error) {
      console.error("Failed to save language and currency preferences:", error);
      return false;
    }
  };

  const saveAccountPreferences = () =>
    persistAccountPreferences({ language, currency });

  const setLanguage = (lang: Language) => {
    if (lang !== "en" && lang !== "pt") {
      console.warn(`Invalid language: ${lang}. Defaulting to "en".`);
      return;
    }
    setLanguageState(lang);
    localStorage.setItem("language", lang);
    if (!user) {
      localStorage.setItem("language-manually-selected", "true");
    }
    void persistAccountPreferences({ language: lang });
  };

  const setCurrency = (curr: Currency) => {
    if (!currencyCodes.includes(curr)) {
      console.warn(`Invalid currency: ${curr}. Defaulting to "EUR".`);
      return;
    }
    setCurrencyState(curr);
    localStorage.setItem("currency", curr);
    void persistAccountPreferences({ currency: curr });
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
    }).format(amount);
  };

  const currencySymbol =
    currencies.find((c) => c.code === currency)?.symbol || "€";
  const currencyFractionDigits = new Intl.NumberFormat(
    language === "pt" ? "pt-BR" : "en-US",
    { style: "currency", currency }
  ).resolvedOptions().maximumFractionDigits ?? 2;

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        currency,
        setCurrency,
        saveAccountPreferences,
        t,
        formatCurrency,
        currencySymbol,
        currencyFractionDigits,
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

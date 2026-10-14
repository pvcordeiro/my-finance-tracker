"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { LanguageCurrencyDialog } from "@/components/ui/language-currency-dialog";
import { toast } from "sonner";

export function FirstLoginPreferences() {
  const { user } = useAuth();
  const {
    language,
    currency,
    setLanguage,
    setCurrency,
    saveAccountPreferences,
    t,
  } = useLanguage();
  const [completedForUser, setCompletedForUser] = useState<number | null>(null);

  const tourIncomplete = user?.is_admin
    ? user.admin_tour_completed !== true
    : user?.tour_completed !== true;
  const shouldChoosePreferences = Boolean(
    user && user.minimum_balance_alert == null && tourIncomplete
  );
  const open = shouldChoosePreferences && completedForUser !== user?.id;

  const continueToTour = async () => {
    if (!user) return;
    if (!(await saveAccountPreferences())) {
      toast.error(t("common.error"));
      return;
    }
    setCompletedForUser(user.id);
    window.dispatchEvent(
      new CustomEvent("firstLoginPreferencesCompleted", { detail: user.id })
    );
  };

  return (
    <LanguageCurrencyDialog
      open={open}
      onOpenChange={() => {}}
      language={language}
      currency={currency}
      onLanguageChange={setLanguage}
      onCurrencyChange={setCurrency}
      continueLabel={t("entries.next")}
      onContinue={continueToTour}
      hideCloseButton
      t={t}
    />
  );
}

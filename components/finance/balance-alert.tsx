"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-language";
import { useOnline } from "@/hooks/use-online";
import { usePrivacy } from "@/hooks/use-privacy";
import { getProjectedBalanceAlert } from "@/lib/balance-alert";

export interface ProjectedBalanceMonth {
  label: string;
  year: number;
  balance: number;
}

interface BalanceAlertProps {
  projectedMonths: ProjectedBalanceMonth[];
}

function interpolate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replace(`{${key}}`, value),
    template
  );
}

export function BalanceAlert({ projectedMonths }: BalanceAlertProps) {
  const { currencySymbol, formatCurrency, t } = useLanguage();
  const isOnline = useOnline();
  const { privacyMode, isRevealed } = usePrivacy();
  const [threshold, setThreshold] = useState<number | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPreference = async () => {
      try {
        const response = await fetch("/api/user/minimum-balance-alert", {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!isMounted) return;
        const value = data.minimumBalanceAlert;
        const parsedValue =
          typeof value === "number" && Number.isFinite(value) ? value : null;
        setThreshold(parsedValue);
        setSetupRequired(parsedValue === null);
      } catch (error) {
        console.error("Failed to load minimum balance alert:", error);
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    };

    void loadPreference();
    return () => {
      isMounted = false;
    };
  }, []);

  const saveThreshold = async (value: number) => {
    if (!isOnline || isSaving) return;
    setIsSaving(true);
    setSaveError(false);
    try {
      const response = await fetch("/api/user/minimum-balance-alert", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ minimumBalanceAlert: value }),
      });
      if (!response.ok) throw new Error("Unable to save minimum balance alert");
      const data = await response.json();
      setThreshold(data.minimumBalanceAlert);
      setSetupRequired(false);
    } catch (error) {
      console.error("Failed to save minimum balance alert:", error);
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const saveEnteredThreshold = () => {
    const value = Number(inputValue);
    if (!Number.isFinite(value) || value < 0) return;
    void saveThreshold(value);
  };

  if (!isLoaded) return null;

  const normalizedThreshold = threshold ?? 0;
  const alert = threshold === null
    ? null
    : getProjectedBalanceAlert(projectedMonths, normalizedThreshold);
  const alertMonth = alert?.month;
  const firstNegative = alert?.firstNegative;
  const isNegativeAlert = alert?.type === "negative";
  const hideAmounts = privacyMode && !isRevealed;
  const formatAlertAmount = (value: number) =>
    hideAmounts ? t("settings.hiddenForPrivacy") : formatCurrency(value);
  const alertMessage = alertMonth
    ? isNegativeAlert
      ? interpolate(t("dashboard.balanceAlertNegative"), {
          month: `${alertMonth.label} ${alertMonth.year}`,
          balance: formatAlertAmount(alertMonth.balance),
        })
      : firstNegative
      ? interpolate(t("dashboard.balanceAlertBelowMinimum"), {
          threshold: formatAlertAmount(normalizedThreshold),
          month: `${alertMonth.label} ${alertMonth.year}`,
          balance: formatAlertAmount(alertMonth.balance),
          negativeMonth: `${firstNegative.label} ${firstNegative.year}`,
          negativeBalance: formatAlertAmount(firstNegative.balance),
        })
      : interpolate(t("dashboard.balanceAlertLow"), {
          threshold: formatAlertAmount(normalizedThreshold),
          month: `${alertMonth.label} ${alertMonth.year}`,
          balance: formatAlertAmount(alertMonth.balance),
        })
    : null;

  return (
    <>
      {alertMessage && (
        <section
          className={
            isNegativeAlert
              ? "rounded-xl border border-finance-negative/35 bg-finance-negative/10 px-4 py-3 sm:px-5"
              : "rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 sm:px-5"
          }
          role="alert"
        >
          <div className="flex items-start gap-3">
            <span
              className={
                isNegativeAlert
                  ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-finance-negative/15 text-finance-negative"
                  : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300"
              }
            >
              {isNegativeAlert ? (
                <ShieldAlert className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">{t("dashboard.balanceAlertTitle")}</h2>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                {alertMessage}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("dashboard.balanceAlertProjectionNote")}
              </p>
            </div>
          </div>
        </section>
      )}

      <AlertDialog open={setupRequired}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.minimumBalanceAlertSetupTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.minimumBalanceAlertSetupDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="minimum-balance-alert">
              {t("settings.minimumBalanceAlertInput")}
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                id="minimum-balance-alert"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className="pl-8"
                placeholder="0.00"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
              />
            </div>
            {saveError && (
              <p role="alert" className="text-sm text-destructive">
                {t("settings.minimumBalanceAlertFailed")}
              </p>
            )}
          </div>
          <AlertDialogFooter className="!flex-col gap-2 sm:!flex-row sm:justify-end sm:space-x-0">
            <Button
              type="button"
              disabled={
                !isOnline ||
                isSaving ||
                !inputValue ||
                !Number.isFinite(Number(inputValue)) ||
                Number(inputValue) < 0
              }
              onClick={saveEnteredThreshold}
            >
              {t("settings.minimumBalanceAlertSave")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="sm:order-none"
              disabled={!isOnline || isSaving}
              onClick={() => void saveThreshold(0)}
            >
              {t("settings.minimumBalanceAlertIgnore")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

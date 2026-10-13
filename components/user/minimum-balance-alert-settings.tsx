"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-language";
import { useOnline } from "@/hooks/use-online";

export function MinimumBalanceAlertSettings() {
  const { currencySymbol, t } = useLanguage();
  const isOnline = useOnline();
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
        if (isMounted && typeof data.minimumBalanceAlert === "number") {
          setValue(String(data.minimumBalanceAlert));
        } else if (isMounted) {
          setValue("0");
        }
      } catch (error) {
        console.error("Failed to load minimum balance alert:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadPreference();
    return () => {
      isMounted = false;
    };
  }, []);

  const save = async () => {
    const minimumBalanceAlert = Number(value);
    if (
      !isOnline ||
      isSaving ||
      !value ||
      !Number.isFinite(minimumBalanceAlert) ||
      minimumBalanceAlert < 0
    ) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/user/minimum-balance-alert", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ minimumBalanceAlert }),
      });
      if (!response.ok) throw new Error("Unable to save minimum balance alert");
      const data = await response.json();
      setValue(String(data.minimumBalanceAlert));
      toast.success(t("settings.minimumBalanceAlertUpdated"));
    } catch (error) {
      console.error("Failed to save minimum balance alert:", error);
      toast.error(t("settings.minimumBalanceAlertFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const canSave =
    isOnline &&
    !isLoading &&
    !isSaving &&
    Boolean(value) &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-300" />
          {t("settings.minimumBalanceAlert")}
        </CardTitle>
        <CardDescription>{t("settings.minimumBalanceAlertDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Label htmlFor="minimum-balance-alert-setting">
          {t("settings.minimumBalanceAlertInput")}
        </Label>
        <div className="flex w-full max-w-md items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {currencySymbol}
            </span>
            <Input
              id="minimum-balance-alert-setting"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              className="pl-8"
              placeholder="0.00"
              value={value}
              disabled={isLoading || !isOnline}
              onChange={(event) => setValue(event.target.value)}
            />
          </div>
          <Button
            type="button"
            className="h-10 shrink-0"
            disabled={!canSave}
            onClick={() => void save()}
          >
            {isSaving ? t("settings.updating") : t("settings.minimumBalanceAlertSave")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("settings.minimumBalanceAlertNegativeOnlyHint")}
        </p>
      </CardContent>
    </Card>
  );
}

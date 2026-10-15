"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Download, Smartphone } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { usePathname } from "next/navigation";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "finance-tracker-pwa-install-dismissed";
const AVAILABILITY_EVENT = "pwaInstallAvailabilityChanged";
const AVAILABILITY_REQUEST_EVENT = "pwaInstallAvailabilityRequest";
const OPEN_EVENT = "openPwaInstallPrompt";

type InstallInstructionsKey =
  | "pwa.installInstructionsChromeAndroid"
  | "pwa.installInstructionsChromeDesktop"
  | "pwa.installInstructionsEdge"
  | "pwa.installInstructionsSafariIos"
  | "pwa.installInstructionsSafariMac"
  | "pwa.installInstructionsFirefox"
  | "pwa.installInstructionsOther";

function getInstallInstructionsKey(): InstallInstructionsKey {
  const userAgent = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "pwa.installInstructionsSafariIos";
  if (/Edg\//i.test(userAgent)) return "pwa.installInstructionsEdge";
  if (/Android/i.test(userAgent) && /Chrome\//i.test(userAgent)) {
    return "pwa.installInstructionsChromeAndroid";
  }
  if (/Firefox\//i.test(userAgent)) return "pwa.installInstructionsFirefox";
  if (/Chrome\//i.test(userAgent)) return "pwa.installInstructionsChromeDesktop";
  if (/Safari\//i.test(userAgent) && /Macintosh/i.test(userAgent)) {
    return "pwa.installInstructionsSafariMac";
  }
  return "pwa.installInstructionsOther";
}

function isAppInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PWAInstallPrompt() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [showManualInstallHelp, setShowManualInstallHelp] = useState(false);
  const [manualInstructionsKey, setManualInstructionsKey] =
    useState<InstallInstructionsKey>("pwa.installInstructionsOther");
  const [onboardingCompleteFor, setOnboardingCompleteFor] = useState<number | null>(null);
  const [alertConfiguredFor, setAlertConfiguredFor] = useState<number | null>(null);

  const reportInstallAvailability = (available: boolean) => {
    window.dispatchEvent(
      new CustomEvent(AVAILABILITY_EVENT, { detail: available })
    );
  };

  useEffect(() => {
    const reportAvailability = () => {
      reportInstallAvailability(!isAppInstalled());
    };
    const openPrompt = () => {
      if (isAppInstalled()) return;
      setShowManualInstallHelp(false);
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    };
    window.addEventListener(AVAILABILITY_REQUEST_EVENT, reportAvailability);
    window.addEventListener(OPEN_EVENT, openPrompt);
    const displayMode = window.matchMedia("(display-mode: standalone)");
    displayMode.addEventListener("change", reportAvailability);
    reportAvailability();
    return () => {
      window.removeEventListener(AVAILABILITY_REQUEST_EVENT, reportAvailability);
      window.removeEventListener(OPEN_EVENT, openPrompt);
      displayMode.removeEventListener("change", reportAvailability);
    };
  }, [deferredPrompt]);

  useEffect(() => {
    if (!user) return;

    const handleOnboardingComplete = () => setOnboardingCompleteFor(user.id);
    const handleAlertConfigured = () => setAlertConfiguredFor(user.id);
    window.addEventListener("guidedTourEnded", handleOnboardingComplete);
    window.addEventListener("minimumBalanceAlertSaved", handleAlertConfigured);
    return () => {
      window.removeEventListener("guidedTourEnded", handleOnboardingComplete);
      window.removeEventListener("minimumBalanceAlertSaved", handleAlertConfigured);
    };
  }, [user]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      isAppInstalled()
    ) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const prompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(prompt);
      reportInstallAvailability(!isAppInstalled());
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setVisible(false);
      setAnimating(false);
      setShowManualInstallHelp(false);
      localStorage.setItem(DISMISSED_KEY, "1");
      reportInstallAvailability(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const onboardingComplete = Boolean(
      user &&
        (user.tour_completed === true ||
          user.admin_tour_completed === true ||
          onboardingCompleteFor === user.id)
    );
    const alertConfigured = user?.minimum_balance_alert != null || alertConfiguredFor === user?.id;
    const excludedPath =
      pathname === "/verify-email" ||
      pathname === "/email-confirmed" ||
      pathname === "/reset-password";

    if (
      !deferredPrompt ||
      !onboardingComplete ||
      !alertConfigured ||
      excludedPath ||
      localStorage.getItem(DISMISSED_KEY)
    ) {
      return;
    }

    // Let the onboarding/alert dialog close before offering installation.
    const timeout = window.setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [alertConfiguredFor, deferredPrompt, onboardingCompleteFor, pathname, user]);

  const dismiss = () => {
    setAnimating(false);
    setTimeout(() => setVisible(false), 320);
    localStorage.setItem(DISMISSED_KEY, "1");
    reportInstallAvailability(Boolean(deferredPrompt) && !isAppInstalled());
  };

  const install = async () => {
    if (!deferredPrompt) {
      setManualInstructionsKey(getInstallInstructionsKey());
      setShowManualInstallHelp(true);
      return;
    }
    const prompt = deferredPrompt;
    // Hide our prompt synchronously before opening the browser's native install UI.
    flushSync(() => {
      setAnimating(false);
      setVisible(false);
    });
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        localStorage.setItem(DISMISSED_KEY, "1");
      }
      setDeferredPrompt(null);
      setShowManualInstallHelp(false);
      reportInstallAvailability(false);
    } catch (error) {
      console.error("Unable to open PWA install prompt:", error);
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    }
  };

  if (
    !user ||
    !visible
  ) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[2px] transition-opacity duration-300"
        style={{ opacity: animating ? 1 : 0 }}
        aria-hidden="true"
      />

      {/* Bottom sheet — z-[70] puts it above the bottom nav (z-50) */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[70] flex justify-center transition-all duration-300 md:inset-0 md:items-center md:p-6 ${
          animating
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 md:translate-y-4"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={t("pwa.title")}
      >
        {/* Safe area padding for iOS */}
        <div className="mx-0 w-full rounded-t-2xl border-t border-border bg-card pb-safe shadow-2xl md:max-w-lg md:rounded-2xl md:border md:pb-0">
          <div className="px-5 pt-5 pb-6 space-y-4">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* App icon placeholder */}
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Smartphone className="w-6 h-6 text-primary-contrast" />
                </div>
                <div>
                  <p className="font-semibold text-foreground leading-tight">
                    {t("pwa.title")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("pwa.subtitle")}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {showManualInstallHelp
                ? t(manualInstructionsKey)
                : t("pwa.description")}
            </p>

            {/* Action buttons */}
            <div className="flex gap-2.5">
              {!showManualInstallHelp && (
                <button
                  onClick={dismiss}
                  className="flex-1 h-10 rounded-lg border border-border bg-background text-sm font-medium text-muted-foreground hover:bg-muted transition-colors active:scale-[0.98]"
                >
                  {t("pwa.notNow")}
                </button>
              )}
              <button
                onClick={showManualInstallHelp ? dismiss : install}
                className={`${showManualInstallHelp ? "w-full" : "flex-[2]"} h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity active:scale-[0.98] flex items-center justify-center gap-2`}
              >
                {showManualInstallHelp ? (
                  t("pwa.close")
                ) : deferredPrompt ? (
                  <>
                    <Download className="w-4 h-4" />
                    {t("pwa.install")}
                  </>
                ) : (
                  t("pwa.howToInstall")
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

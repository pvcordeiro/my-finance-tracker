"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "finance-tracker-pwa-install-dismissed";

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      localStorage.getItem(DISMISSED_KEY) ||
      window.matchMedia("(display-mode: standalone)").matches
    ) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Small delay so the page has settled before showing the prompt
      setTimeout(() => {
        setVisible(true);
        requestAnimationFrame(() => setAnimating(true));
      }, 1500);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const dismiss = () => {
    setAnimating(false);
    setTimeout(() => setVisible(false), 320);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      dismiss();
    }
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300"
        style={{ opacity: animating ? 1 : 0 }}
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300"
        style={{
          transform: animating ? "translateY(0)" : "translateY(110%)",
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Install Finance Tracker"
      >
        {/* Safe area padding for iOS */}
        <div className="bg-card border-t border-border rounded-t-2xl shadow-2xl mx-0 pb-safe">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          <div className="px-5 pt-3 pb-6 space-y-4">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* App icon placeholder */}
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground leading-tight">
                    Finance Tracker
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add to Home Screen
                  </p>
                </div>
              </div>
              <button
                onClick={dismiss}
                className="w-7 h-7 rounded-full bg-muted hover:bg-secondary flex items-center justify-center transition-colors shrink-0 mt-0.5"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              Install for quick access and offline use — works even without
              internet.
            </p>

            {/* Action buttons */}
            <div className="flex gap-2.5">
              <button
                onClick={dismiss}
                className="flex-1 h-10 rounded-lg border border-border bg-background text-sm font-medium text-muted-foreground hover:bg-muted transition-colors active:scale-[0.98]"
              >
                Not now
              </button>
              <button
                onClick={install}
                className="flex-[2] h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Install app
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      console.log("PWA ready");
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const deferredPrompt = e as BeforeInstallPromptEvent;
      console.log("Install prompt available", deferredPrompt);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  return null;
}

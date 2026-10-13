"use client";

import { useEffect } from "react";

const DEVELOPMENT_CACHE_PREFIXES = [
  "pages-cache",
  "auth-session-cache",
  "entries-cache",
  "bank-amount-cache",
  "next-static-cache",
  "next-image-cache",
  "static-assets-cache",
  "serwist",
  "workbox",
];

export function DevelopmentServiceWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !("serviceWorker" in navigator)) {
      return;
    }

    let cancelled = false;

    const cleanup = async () => {
      const hadController = Boolean(navigator.serviceWorker.controller);
      const registrations = await navigator.serviceWorker.getRegistrations();
      const appRegistrations = registrations.filter((registration) =>
        [registration.active, registration.installing, registration.waiting].some(
          (worker) => {
            if (!worker) return false;
            return new URL(worker.scriptURL).pathname === "/serwist/sw.js";
          }
        )
      );

      await Promise.all(appRegistrations.map((registration) => registration.unregister()));

      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter(
              (name) =>
                DEVELOPMENT_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix)) ||
                name.startsWith("workbox-precache")
            )
            .map((name) => caches.delete(name))
        );
      }

      const cleanupReloadKey = "finance-tracker-sw-cleanup-reload";
      if (
        !cancelled &&
        hadController &&
        appRegistrations.length > 0 &&
        sessionStorage.getItem(cleanupReloadKey) !== "1"
      ) {
        sessionStorage.setItem(cleanupReloadKey, "1");
        window.location.reload();
      }
    };

    void cleanup();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

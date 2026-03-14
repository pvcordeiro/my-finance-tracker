"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Height of the banner strip — used by layouts to add matching top-padding. */
export const OFFLINE_BANNER_HEIGHT = 36;

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [hasEverBeenOffline, setHasEverBeenOffline] = useState(false);

  useEffect(() => {
    // Initialize from current state (don't assume online on mount)
    if (!navigator.onLine) {
      setIsOffline(true);
      setHasEverBeenOffline(true);
    }

    const handleOffline = () => {
      setIsOffline(true);
      setHasEverBeenOffline(true);
    };

    const handleOnline = () => {
      setIsOffline(false);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Don't render anything until we've actually gone offline at least once
  if (!hasEverBeenOffline) return null;

  return (
    <>
      <style>{`
        .offline-banner-row {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 300ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .offline-banner-row[data-visible="true"] {
          grid-template-rows: 1fr;
        }
        @media (prefers-reduced-motion: reduce) {
          .offline-banner-row {
            transition: none;
          }
        }
        .offline-banner-inner {
          overflow: hidden;
        }
        .offline-reconnected-row {
          display: grid;
          grid-template-rows: 1fr;
          transition: grid-template-rows 300ms cubic-bezier(0.16, 1, 0.3, 1) 2000ms;
        }
        .offline-reconnected-row[data-gone="true"] {
          grid-template-rows: 0fr;
        }
        @media (prefers-reduced-motion: reduce) {
          .offline-reconnected-row {
            transition: none;
          }
        }
      `}</style>

      {/* Offline banner — fixed so it stays visible while scrolling */}
      <div
        className="offline-banner-row fixed top-0 left-0 right-0 z-[100]"
        data-visible={isOffline ? "true" : "false"}
        role="status"
        aria-live="polite"
        aria-label="Network status"
      >
        <div className="offline-banner-inner">
          <div
            style={{
              backgroundColor: "oklch(0.75 0.12 75)",
              color: "oklch(0.25 0.06 75)",
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium"
          >
            <WifiOff
              size={14}
              strokeWidth={2}
              aria-hidden="true"
              className="shrink-0"
            />
            <span>No internet connection — showing cached data</span>
          </div>
        </div>
      </div>
    </>
  );
}

function ReconnectedBanner() {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGone(true), 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="offline-reconnected-row fixed top-0 left-0 right-0 z-[100]"
      data-gone={gone ? "true" : "false"}
      role="status"
      aria-live="polite"
    >
      <div className="offline-banner-inner">
        <div
          style={{
            backgroundColor: "oklch(0.75 0.12 145)",
            color: "oklch(0.25 0.06 145)",
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium"
        >
          <span>Back online — data refreshing</span>
        </div>
      </div>
    </div>
  );
}

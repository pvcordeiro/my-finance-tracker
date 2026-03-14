"use client";

import { useRouter } from "next/navigation";
import { OFFLINE_BANNER_HEIGHT } from "@/components/pwa/offline-banner";
import { useOnline } from "@/hooks/use-online";
import { type ReactNode } from "react";

interface MinimalPageHeaderProps {
  title: string;
  /** Icon rendered inside the rounded avatar. Defaults to a € symbol. */
  icon?: ReactNode;
  /** Tailwind class for the icon background circle. Defaults to "bg-primary". */
  iconBg?: string;
  /** Tailwind class for the title text color. Defaults to "text-primary". */
  titleColor?: string;
}

/**
 * A minimal sticky header used on pages that have custom headers (/user, /admin).
 * Rendered above <OfflineBlockedPage /> when the device is offline so the layout
 * is consistent with the online version without pulling in the full page shell.
 */
export function MinimalPageHeader({ title, icon, iconBg = "bg-primary", titleColor = "text-primary" }: MinimalPageHeaderProps) {
  const router = useRouter();
  const isOnline = useOnline();

  return (
    <header
      className="bg-background/90 backdrop-blur-sm border-b border-border/50 sticky z-50"
      style={{
        top: isOnline ? 0 : OFFLINE_BANNER_HEIGHT,
        marginTop: isOnline ? 0 : OFFLINE_BANNER_HEIGHT,
      }}
    >
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div
          className="flex items-center gap-2 sm:gap-3 cursor-pointer"
          onClick={() => router.push("/")}
        >
          <div className={`w-8 h-8 sm:w-10 sm:h-10 ${iconBg} rounded-full flex items-center justify-center`}>
            {icon ?? (
              <span className="text-lg sm:text-xl font-bold text-primary-foreground">
                €
              </span>
            )}
          </div>
          <div>
            <h1 className={`text-lg sm:text-xl font-bold ${titleColor}`}>{title}</h1>
          </div>
        </div>
      </div>
    </header>
  );
}

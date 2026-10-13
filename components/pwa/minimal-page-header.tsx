"use client";

import { useRouter } from "next/navigation";
import { OFFLINE_BANNER_HEIGHT } from "@/components/pwa/offline-banner";
import { useOnline } from "@/hooks/use-online";
import { FinanceLogo } from "@/components/ui/finance-logo";

interface MinimalPageHeaderProps {
  title: string;
  /** Tailwind class for the title text color. Defaults to "text-primary-contrast". */
  titleColor?: string;
}

/**
 * A minimal sticky header used on pages that have custom headers (/user, /admin).
 * Rendered above <OfflineBlockedPage /> when the device is offline so the layout
 * is consistent with the online version without pulling in the full page shell.
 */
export function MinimalPageHeader({ title, titleColor = "text-primary-contrast" }: MinimalPageHeaderProps) {
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
          <FinanceLogo className="h-8 w-8 sm:h-10 sm:w-10" />
          <div>
            <h1 className={`text-lg sm:text-xl font-bold ${titleColor}`}>{title}</h1>
          </div>
        </div>
      </div>
    </header>
  );
}

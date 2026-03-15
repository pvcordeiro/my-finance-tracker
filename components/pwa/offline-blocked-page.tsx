"use client";

import { WifiOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { OFFLINE_BANNER_HEIGHT } from "@/components/pwa/offline-banner";
import { useLanguage } from "@/hooks/use-language";

interface OfflineBlockedPageProps {
  /** Optional custom message. Overrides the default translated description. */
  message?: string;
}

export function OfflineBlockedPage({ message }: OfflineBlockedPageProps) {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <main
      className="flex flex-col items-center justify-center min-h-[calc(100dvh-4rem)] px-4 text-center"
      style={{ paddingTop: OFFLINE_BANNER_HEIGHT }}
    >
      <div className="flex flex-col items-center gap-5 max-w-sm w-full">
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: "oklch(0.75 0.12 75 / 0.2)",
            color: "oklch(0.45 0.1 75)",
          }}
        >
          <WifiOff className="w-7 h-7" strokeWidth={1.75} />
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-foreground tracking-tight">
            {t("common.offlineTitle")}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {message ?? t("common.offlineDescription")}
          </p>
        </div>

        {/* Back button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/")}
          className="flex items-center gap-2 mt-1"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("common.goToSummary")}
        </Button>
      </div>
    </main>
  );
}

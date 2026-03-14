"use client";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function NoGroupOverlay({ className }: { className?: string }) {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted) return;
    if (pathname === "/user") return;
    if (user && Array.isArray(user.groups) && user.groups.length === 0) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [mounted, user, pathname]);

  if (!mounted || isLoading) return null;
  if (pathname === "/user") return null;
  if (!user) return null;
  const hasGroups = Array.isArray(user.groups) && user.groups.length > 0;
  if (hasGroups) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-auto"
      role="alert"
      aria-live="assertive"
    >
      <div className="absolute inset-0 bg-black/30 dark:bg-background/60 backdrop-blur-sm cursor-not-allowed transition-colors" />
      <div
        className={cn(
          "relative pointer-events-auto w-full max-w-md mx-10 sm:mx-auto rounded-lg border border-amber-500/60 bg-amber-50/95 dark:bg-amber-900/40 p-6 shadow-xl text-amber-900 dark:text-amber-100 animate-in fade-in zoom-in-95 backdrop-blur-sm",
          className
        )}
      >
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-8 h-8 shrink-0" aria-hidden="true" />
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold mb-1">
                {t("settings.noGroupTitle")}
              </h2>
              <p className="text-sm leading-relaxed">
                {t("settings.noGroupDescription")}
              </p>
            </div>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>{t("settings.noGroupAskAdmin")}</li>
              <li>{t("settings.noGroupRefresh")}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

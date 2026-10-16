"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Edit, FileSpreadsheet, Settings } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useOnline } from "@/hooks/use-online";
import { cn } from "@/lib/utils";

type AppNavigationProps = {
  placement: "desktop" | "mobile";
};

export function AppNavigation({ placement }: AppNavigationProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const isOnline = useOnline();

  const navItems = [
    {
      href: "/manage",
      label: t("navigation.manage"),
      icon: Edit,
      offlineDisabled: true,
    },
    {
      href: "/",
      label: t("dashboard.summary"),
      icon: BarChart3,
      offlineDisabled: false,
    },
    {
      href: "/details",
      label: t("navigation.details"),
      icon: FileSpreadsheet,
      offlineDisabled: false,
    },
    {
      href: "/user",
      label: t("navigation.settings"),
      compactLabel: t("navigation.settings"),
      icon: Settings,
      offlineDisabled: true,
    },
  ];

  if (placement === "desktop") {
    return (
      <nav
        aria-label={t("navigation.main")}
        className="hidden sm:flex justify-center gap-4 pt-2 border-t border-border/50 mt-2"
      >
        {navItems.map(({ href, label, icon: Icon, offlineDisabled }) => {
          const isDisabled = offlineDisabled && !isOnline;
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={isDisabled ? "#" : href}
              onClick={isDisabled ? (event) => event.preventDefault() : undefined}
              aria-current={isActive ? "page" : undefined}
              aria-disabled={isDisabled}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isDisabled
                  ? "pointer-events-none text-muted-foreground/40"
                  : isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      data-tour-fixed-footer
      aria-label={t("navigation.main")}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background shadow-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-16 items-center px-2">
        {navItems.map(({ href, label, compactLabel, icon: Icon, offlineDisabled }) => {
          const isDisabled = offlineDisabled && !isOnline;
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={isDisabled ? "#" : href}
              onClick={isDisabled ? (event) => event.preventDefault() : undefined}
              aria-current={isActive ? "page" : undefined}
              aria-disabled={isDisabled}
              aria-label={label}
              title={label}
              className={cn(
                "relative flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center px-0.5 py-2 text-[11px] font-medium leading-tight transition-colors",
                isDisabled
                  ? "pointer-events-none text-muted-foreground/40"
                  : isActive
                    ? "text-primary-contrast"
                    : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && !isDisabled && (
                <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
              )}
              <Icon className="mb-1 h-5 w-5 shrink-0" />
              <span className="max-w-full truncate">{compactLabel || label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

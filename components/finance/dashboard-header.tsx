"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  ChevronDown,
  Shield,
  User,
  Eye,
  EyeOff,
  Download,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { usePrivacy } from "@/hooks/use-privacy";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { AppNavigation } from "@/components/ui/app-navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { LanguageCurrencySelector } from "@/components/ui/language-currency-selector";
import { LanguageCurrencyDialog } from "@/components/ui/language-currency-dialog";
import { useOnline } from "@/hooks/use-online";
import { OFFLINE_BANNER_HEIGHT } from "@/components/pwa/offline-banner";
import {
  GroupSelectorDialog,
  GroupSelectorMenuItem,
} from "@/components/ui/group-selector";
import { FinanceLogo } from "@/components/ui/finance-logo";
import { isPwaInstalled } from "@/lib/pwa";

interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
  showPrivacyToggle?: boolean;
  desktopOverlay?: boolean;
  onDesktopHeightChange?: (height: number) => void;
}

export function DashboardHeader({
  title,
  subtitle,
  showPrivacyToggle = true,
  desktopOverlay = false,
  onDesktopHeightChange,
}: DashboardHeaderProps) {
  const { user, logout } = useAuth();
  const { privacyMode, isLoading: privacyLoading } = usePrivacy();
  const { t, language, currency, setLanguage, setCurrency } =
    useLanguage();
  const router = useRouter();
  const isMobile = useIsMobile();
  const isOnline = useOnline();
  const [languageDialogOpen, setLanguageDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [canInstallApp, setCanInstallApp] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!desktopOverlay || !onDesktopHeightChange || !headerRef.current) return;

    const header = headerRef.current;
    const updateHeight = () => onDesktopHeightChange(header.getBoundingClientRect().height);
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    updateHeight();

    return () => observer.disconnect();
  }, [desktopOverlay, onDesktopHeightChange]);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    let active = true;
    const updateInstalledState = async () => {
      const installed = await isPwaInstalled();
      if (active) setCanInstallApp(!installed);
    };
    const handleAvailabilityChange = (event: Event) => {
      if ((event as CustomEvent<boolean>).detail === false) {
        setCanInstallApp(false);
      } else {
        void updateInstalledState();
      }
    };
    window.addEventListener("pwaInstallAvailabilityChanged", handleAvailabilityChange);
    displayMode.addEventListener("change", updateInstalledState);
    window.addEventListener("appinstalled", updateInstalledState);
    updateInstalledState();
    window.dispatchEvent(new Event("pwaInstallAvailabilityRequest"));
    return () => {
      active = false;
      window.removeEventListener("pwaInstallAvailabilityChanged", handleAvailabilityChange);
      displayMode.removeEventListener("change", updateInstalledState);
      window.removeEventListener("appinstalled", updateInstalledState);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const handlePrivacyToggle = async () => {
    if (!isOnline) {
      toast.error(t("common.offlineError"));
      return;
    }
    try {
      const newPrivacyMode = !privacyMode;
      const response = await fetch("/api/user/privacy-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ privacyMode: newPrivacyMode }),
      });

      if (response.ok) {
        toast.success(
          newPrivacyMode
            ? t("settings.privacyEnabled")
            : t("settings.privacyDisabled")
        );
        window.dispatchEvent(
          new CustomEvent("privacyModeUpdated", {
            detail: { privacyMode: newPrivacyMode },
          })
        );
      } else {
        toast.error(t("settings.failedToUpdatePrivacy"));
      }
    } catch (error) {
      console.error("Failed to toggle privacy mode:", error);
      toast.error(t("common.error"));
    }
  };

  return (
    <header
      ref={headerRef}
      data-tour-fixed-header
      className={`bg-background/90 backdrop-blur-sm border-b border-border/50 sticky z-50 ${desktopOverlay ? "lg:absolute lg:inset-x-0 lg:top-0" : ""}`}
      style={{
        top: isOnline ? 0 : OFFLINE_BANNER_HEIGHT,
        marginTop: isOnline ? 0 : OFFLINE_BANNER_HEIGHT,
      }}
    >
      <div className="container mx-auto px-3 py-2.5 sm:px-4 sm:py-4 sm:pb-2">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-3"
            aria-label={t("dashboard.title")}
          >
            <FinanceLogo className="h-8 w-8 sm:h-10 sm:w-10" />
            <div>
              <span className="text-lg sm:text-xl font-bold text-foreground block">
                {title || t("dashboard.title")}
              </span>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                {subtitle || t("dashboard.subtitle")}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-4">
            {showPrivacyToggle && (
              <Button
                data-tour="tour-privacy"
                variant="outline"
                size="sm"
                onClick={handlePrivacyToggle}
                disabled={privacyLoading}
                className="h-9 w-9 shrink-0 px-0 sm:w-auto sm:px-3"
                aria-label={
                  privacyMode
                    ? t("settings.disablePrivacy")
                    : t("settings.enablePrivacy")
                }
                title={
                  privacyMode
                    ? t("settings.disablePrivacy")
                    : t("settings.enablePrivacy")
                }
              >
                {privacyMode ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                {!isMobile && (
                  <span className="text-sm">
                    {privacyMode ? t("settings.private") : t("settings.visible")}
                  </span>
                )}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  <span className="max-w-24 truncate">{user?.username}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user?.is_admin && (
                  <DropdownMenuItem
                    onClick={() => router.push("/admin")}
                    className="cursor-pointer"
                    disabled={!isOnline}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {t("admin.title")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => window.dispatchEvent(new Event("startGuidedTour"))}
                  className="cursor-pointer"
                >
                  <Compass className="w-4 h-4 mr-2" />
                  {t("guidedTour.replay")}
                </DropdownMenuItem>
                {user?.groups && user.groups.length > 1 && (
                  <GroupSelectorMenuItem onOpenChange={setGroupDialogOpen} />
                )}
                <DropdownMenuItem
                  onClick={() => setLanguageDialogOpen(true)}
                  className="cursor-pointer"
                >
                  <LanguageCurrencySelector showInDropdown />
                </DropdownMenuItem>
                {canInstallApp && (
                  <DropdownMenuItem
                    onClick={() => window.dispatchEvent(new Event("openPwaInstallPrompt"))}
                    className="cursor-pointer"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t("pwa.install")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("common.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {user?.groups && user.groups.length > 1 && (
              <GroupSelectorDialog
                open={groupDialogOpen}
                onOpenChange={setGroupDialogOpen}
              />
            )}
          </div>
        </div>

        {/* Desktop Navigation */}
        {!isMobile && (
          <AppNavigation placement="desktop" />
        )}
      </div>

      {/* Language/Currency Dialog */}
      <LanguageCurrencyDialog
        open={languageDialogOpen}
        onOpenChange={setLanguageDialogOpen}
        language={language}
        currency={currency}
        onLanguageChange={setLanguage}
        onCurrencyChange={setCurrency}
        continueLabel={t("common.confirm")}
        onContinue={() => setLanguageDialogOpen(false)}
        hideCloseButton
        t={t}
      />
    </header>
  );
}

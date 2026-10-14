"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  ChevronDown,
  Shield,
  User,
  Eye,
  EyeOff,
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

interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
  showPrivacyToggle?: boolean;
}

export function DashboardHeader({
  title,
  subtitle,
  showPrivacyToggle = true,
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
  const [notifiedMultiGroup, setNotifiedMultiGroup] = useState(false);

  useEffect(() => {
    if (!user?.groups || user.groups.length <= 1 || notifiedMultiGroup) return;
    const notificationKey = `finance-tracker-multi-group-notice-${user.id}`;
    if (localStorage.getItem(notificationKey) === "shown") {
      setNotifiedMultiGroup(true);
      return;
    }
    localStorage.setItem(notificationKey, "shown");
    setNotifiedMultiGroup(true);
    toast.info(t("guidedTour.groupAccessNotice"), {
      action: {
        label: t("settings.groupSelection"),
        onClick: () => setGroupDialogOpen(true),
      },
    });
  }, [user?.id, user?.groups?.length, notifiedMultiGroup, t]);

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
      data-tour-fixed-header
      className="bg-background/90 backdrop-blur-sm border-b border-border/50 sticky z-50"
      style={{
        top: isOnline ? 0 : OFFLINE_BANNER_HEIGHT,
        marginTop: isOnline ? 0 : OFFLINE_BANNER_HEIGHT,
      }}
    >
      <div className="container mx-auto px-4 py-3 sm:py-4 sm:pb-2">
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

          <div className="flex items-center gap-2 sm:gap-4">
            {showPrivacyToggle && (
              <Button
                data-tour="tour-privacy"
                variant="outline"
                size="sm"
                onClick={handlePrivacyToggle}
                disabled={privacyLoading}
                className="flex items-center gap-2"
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
                  className="flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  <span>{user?.username}</span>
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
        t={t}
      />
    </header>
  );
}

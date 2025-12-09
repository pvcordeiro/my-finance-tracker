"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  ChevronDown,
  Shield,
  User,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { usePrivacy } from "@/hooks/use-privacy";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Edit, BarChart3, FileSpreadsheet } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
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

export function DashboardHeader() {
  const { user, logout } = useAuth();
  const { privacyMode, isLoading: privacyLoading } = usePrivacy();
  const { t, currencySymbol, language, currency, setLanguage, setCurrency } =
    useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const [languageDialogOpen, setLanguageDialogOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const handlePrivacyToggle = async () => {
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

  const navItems = [
    { href: "/manage", label: t("navigation.manage"), icon: Edit },
    { href: "/", label: t("dashboard.summary"), icon: BarChart3 },
    { href: "/details", label: t("navigation.details"), icon: FileSpreadsheet },
  ];

  return (
    <header className="bg-background/90 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 sm:py-4 sm:pb-2">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer"
            onClick={() => router.push("/")}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-lg sm:text-xl font-bold text-primary-foreground">
                {currencySymbol}
              </span>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-primary">
                {t("dashboard.title")}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                {t("dashboard.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrivacyToggle}
              disabled={privacyLoading}
              className="flex items-center gap-2"
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
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {t("admin.title")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => router.push("/user")}
                  className="cursor-pointer"
                >
                  <User className="w-4 h-4 mr-2" />
                  {t("settings.accountSettings")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/manage?tab=management")}
                  className="cursor-pointer"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {t("manage.backup")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
          </div>
        </div>

        {/* Desktop Navigation */}
        {!isMobile && (
          <nav className="hidden sm:flex justify-center gap-4 pt-2 border-t border-border/50 mt-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive =
                href === "/manage"
                  ? pathname === href &&
                    searchParams.get("tab") !== "management"
                  : pathname === href;
              return (
                <Button
                  key={href}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => router.push(href)}
                  className="flex items-center gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Button>
              );
            })}
          </nav>
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

"use client";

export const dynamic = "force-dynamic";

import { useAuth } from "@/hooks/use-auth";
import { useFinanceData } from "@/hooks/use-finance-data";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { ChangeUsernameForm } from "@/components/auth/change-username-form";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Palette,
  UserCog,
  Lock,
  Key,
  Laptop,
  Users,
  Check,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { FullPageLoader } from "@/components/ui/loading";
import { Route } from "lucide-react";
import { AccentColorSwitcher } from "@/components/ui/accent-color-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageCurrencyDialog } from "@/components/ui/language-currency-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import { SessionsList } from "@/components/user/sessions-list";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { useOnline } from "@/hooks/use-online";
import { OfflineBlockedPage } from "@/components/pwa/offline-blocked-page";
import { DashboardHeader } from "@/components/finance/dashboard-header";
import { EmailRecoverySettings } from "@/components/user/email-recovery-settings";
import { MinimumBalanceAlertSettings } from "@/components/user/minimum-balance-alert-settings";
import { DataManagement } from "@/components/finance/data-management";
import type { CurrencyCode } from "@/lib/i18n";
import { useGuidedTourMode } from "@/hooks/use-guided-tour-mode";
import { guidedTourFinanceData } from "@/lib/guided-tour-data";

export default function UserSettingsPage() {
  const { user, isLoading, refreshUser } = useAuth();
  const { data, refreshData } = useFinanceData();
  const isGuidedTourActive = useGuidedTourMode();
  const visibleFinanceData = isGuidedTourActive ? guidedTourFinanceData : data;
  const { t, language, setLanguage, currency, setCurrency } = useLanguage();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const isOnline = useOnline();
  const [themeOpen, setThemeOpen] = useState(false);
  const [accentOpen, setAccentOpen] = useState(false);
  const [usernameOpen, setUsernameOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [languageDialogOpen, setLanguageDialogOpen] = useState(false);
  const [currentAccent, setCurrentAccent] = useState<string>("blue");
  const [switchingGroup, setSwitchingGroup] = useState(false);

  const handleLanguageChange = (newLanguage: "en" | "pt") => {
    setLanguage(newLanguage);
    toast.success(t("settings.languageUpdated"));
  };

  const handleCurrencyChange = (newCurrency: CurrencyCode) => {
    setCurrency(newCurrency);
    toast.success(t("settings.currencyUpdated"));
  };

  const handleGroupSwitch = async (groupId: number) => {
    if (!isOnline) {
      toast.error(t("common.offlineError"));
      return;
    }
    setSwitchingGroup(true);
    try {
      const response = await fetch("/api/switch-group", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ groupId }),
        credentials: "include",
      });

      if (response.ok) {
        await refreshUser();
        const groupName =
          user?.groups?.find((g) => g.group_id === groupId)?.name ||
          "selected group";
        toast.success(t("settings.switchedTo") + " " + groupName);
      } else {
        toast.error(t("settings.failedToSwitch"));
      }
    } catch (error) {
      console.error("Failed to switch group:", error);
      toast.error(t("settings.errorSwitching"));
    } finally {
      setSwitchingGroup(false);
    }
  };

  const handleClearData = async () => {
    const response = await fetch("/api/data/clear", {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || t("manage.failedToClearData"));
    }
    await refreshData();
  };

  useEffect(() => {
    fetch("/api/user/accent-color", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.accentColor) {
          setCurrentAccent(data.accentColor);
        }
      })
      .catch((err) => console.error("Failed to fetch accent color:", err));

    const handleAccentColorChange = (event: CustomEvent) => {
      setCurrentAccent(event.detail);
    };

    window.addEventListener(
      "accentColorChanged",
      handleAccentColorChange as EventListener
    );

    return () => {
      window.removeEventListener(
        "accentColorChanged",
        handleAccentColorChange as EventListener
      );
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    const handleTourStep = (event: Event) => {
      const targets = (event as CustomEvent<string[]>).detail || [];
      setThemeOpen(false);
      setAccentOpen(false);
    };
    const resetTourState = () => {
      setThemeOpen(false);
      setAccentOpen(false);
    };
    window.addEventListener("guidedTourStepChanged", handleTourStep);
    window.addEventListener("guidedTourStepReady", handleTourStep);
    window.addEventListener("guidedTourEnded", resetTourState);
    return () => {
      window.removeEventListener("guidedTourStepChanged", handleTourStep);
      window.removeEventListener("guidedTourStepReady", handleTourStep);
      window.removeEventListener("guidedTourEnded", resetTourState);
    };
  }, []);

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="w-4 h-4" />;
      case "dark":
        return <Moon className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const getAccentColor = () => {
    const accentColors: Record<string, string> = {
                  blue: "hsl(217, 91%, 60%)",
                  purple: "hsl(270, 91%, 60%)",
                  yellow: "hsl(65, 100%, 50%)",
                  orange: "hsl(25, 95%, 53%)",
                  pink: "hsl(330, 85%, 60%)",
                  magenta: "hsl(300, 76%, 60%)",
                  cyan: "hsl(190, 76%, 50%)",
                  indigo: "hsl(240, 76%, 60%)",
                  amber: "hsl(45, 93%, 53%)",
    };
    return accentColors[currentAccent] || accentColors.blue;
  };

  if (isLoading) return <FullPageLoader />;
  if (!user) return null;

  if (!isOnline) {
    return (
      <div className="min-h-dvh finance-gradient page-nav-padding">
        <DashboardHeader />
        <OfflineBlockedPage />
      </div>
    );
  }

  return (
    <div className="min-h-dvh finance-gradient page-nav-padding">
      <DashboardHeader />
      <main className="container mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary-contrast">
            {t("settings.accountSettings")}
          </h1>
          <p className="text-muted-foreground">
            {t("settings.managePersonalPreferences")}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-stretch">
        <Card data-tour="tour-appearance">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              {t("settings.customize")}
            </CardTitle>
            <CardDescription>
              {t("settings.customizeDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isMobile ? (
              <>
                <Collapsible open={themeOpen} onOpenChange={setThemeOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span className="flex items-center gap-2">
                        {getThemeIcon()}
                        <span className="text-sm font-medium">
                          {t("settings.theme")}
                        </span>
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          themeOpen ? "rotate-90" : ""
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <div><ThemeToggle /></div>
                  </CollapsibleContent>
                </Collapsible>
                <Collapsible open={accentOpen} onOpenChange={setAccentOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: getAccentColor() }}
                        />
                        <span className="text-sm font-medium">
                          {t("settings.accentColor")}
                        </span>
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          accentOpen ? "rotate-90" : ""
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <div><AccentColorSwitcher /></div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-sm font-medium mb-3">
                    {t("settings.theme")}
                  </h3>
                  <ThemeToggle />
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-3">
                    {t("settings.accentColor")}
                  </h3>
                  <AccentColorSwitcher />
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              {t("settings.updateCredentials")}
            </CardTitle>
            <CardDescription>
              {t("settings.updateCredentialsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isMobile ? (
              <>
                <Collapsible open={usernameOpen} onOpenChange={setUsernameOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <UserCog className="w-4 h-4" />
                        <span className="text-sm font-medium">{t("auth.changeUsername")}</span>
                      </span>
                      <ChevronRight className={`w-4 h-4 transition-transform ${usernameOpen ? "rotate-90" : ""}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <p className="text-sm text-muted-foreground mb-3">{t("settings.changeUsernameDescription")}</p>
                    <ChangeUsernameForm />
                  </CollapsibleContent>
                </Collapsible>
                <Collapsible open={passwordOpen} onOpenChange={setPasswordOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm font-medium">{t("auth.changePassword")}</span>
                      </span>
                      <ChevronRight className={`w-4 h-4 transition-transform ${passwordOpen ? "rotate-90" : ""}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <p className="text-sm text-muted-foreground mb-3">{t("settings.changePasswordDescription")}</p>
                    <ChangePasswordForm />
                  </CollapsibleContent>
                </Collapsible>
              </>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <section>
                  <h3 className="mb-1 text-sm font-medium">{t("auth.changeUsername")}</h3>
                  <p className="mb-3 text-sm text-muted-foreground">{t("settings.changeUsernameDescription")}</p>
                  <ChangeUsernameForm />
                </section>
                <section>
                  <h3 className="mb-1 text-sm font-medium">{t("auth.changePassword")}</h3>
                  <p className="mb-3 text-sm text-muted-foreground">{t("settings.changePasswordDescription")}</p>
                  <ChangePasswordForm />
                </section>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-stretch">
          <MinimumBalanceAlertSettings />
          <Card>
            <CardHeader>
              <CardTitle>{t("auth.recoveryEmail")}</CardTitle>
              <CardDescription>{t("auth.recoveryEmailDescription")}</CardDescription>
            </CardHeader>
            <CardContent><EmailRecoverySettings /></CardContent>
          </Card>
        </div>
        {user && user.groups && user.groups.length > 1 && (
          <Card data-tour="tour-group-selection">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t("settings.groupSelection")}
              </CardTitle>
              <CardDescription>
                {t("settings.groupSelectionDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-muted-foreground">{t("common.groupSwitchInfo")}</p>
              <div className="space-y-2">
                {user.groups.map((group) => {
                  const isCurrentGroup =
                    group.group_id === user.current_group_id;
                  return (
                    <Button
                      key={group.group_id}
                      variant={isCurrentGroup ? "default" : "outline"}
                      className="w-full justify-between"
                      onClick={() => handleGroupSwitch(group.group_id)}
                      disabled={switchingGroup || isCurrentGroup}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Users className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{group.name}</span>
                      </span>
                      {isCurrentGroup && <Check className="w-4 h-4" />}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
        <div data-tour="tour-data-management">
        <DataManagement
          tourPreview={isGuidedTourActive}
          readOnly={isGuidedTourActive}
          isGuidedTourActive={isGuidedTourActive}
          data={visibleFinanceData}
          onImportComplete={refreshData}
          onClearData={handleClearData}
        />
        </div>
        <Card data-tour="tour-active-sessions">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Laptop className="w-5 h-5" />
              {t("settings.activeSessions")}
            </CardTitle>
            <CardDescription>
              {t("settings.activeSessionsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SessionsList tourPreview={isGuidedTourActive} />
          </CardContent>
        </Card>
      </main>

      {/* Language/Currency Dialog */}
      <LanguageCurrencyDialog
        open={languageDialogOpen}
        onOpenChange={setLanguageDialogOpen}
        language={language}
        currency={currency}
        onLanguageChange={handleLanguageChange}
        onCurrencyChange={handleCurrencyChange}
        continueLabel={t("common.confirm")}
        onContinue={() => setLanguageDialogOpen(false)}
        hideCloseButton
        t={t}
      />
    </div>
  );
}

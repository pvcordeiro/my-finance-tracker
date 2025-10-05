"use client";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { ChangeUsernameForm } from "@/components/auth/change-username-form";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LogOut,
  ChevronDown,
  Shield,
  Calculator,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Palette,
  UserCog,
  Lock,
  Key,
  Laptop,
  Save,
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
import { User } from "lucide-react";
import { AccentColorSwitcher } from "@/components/ui/accent-color-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import { SessionsList } from "@/components/user/sessions-list";
import { toast } from "sonner";

export default function UserSettingsPage() {
  const { user, isLoading, logout, refreshUser } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const [themeOpen, setThemeOpen] = useState(false);
  const [accentOpen, setAccentOpen] = useState(false);
  const [usernameOpen, setUsernameOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentAccent, setCurrentAccent] = useState<string>("blue");
  const [switchingGroup, setSwitchingGroup] = useState(false);

  const handleGroupSwitch = async (groupId: number) => {
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
        toast.success("Switched to " + groupName);
        window.location.reload();
      } else {
        toast.error("Failed to switch group");
      }
    } catch (error) {
      console.error("Failed to switch group:", error);
      toast.error("Error switching group");
    } finally {
      setSwitchingGroup(false);
    }
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

  return (
    <div className="min-h-screen finance-gradient">
      <header className="bg-background/90 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2 sm:gap-3 cursor-pointer"
              onClick={() => router.push("/")}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-primary">
                  Account Settings
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Manage your personal account preferences
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  <span>{user.username}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user.is_admin && (
                  <DropdownMenuItem
                    onClick={() => router.push("/admin")}
                    className="cursor-pointer"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => router.push("/")}
                  className="cursor-pointer"
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Back to App
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/manage?tab=management")}
                  className="cursor-pointer"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Backup
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    router.push("/login");
                  }}
                  className="cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Customize
            </CardTitle>
            <CardDescription>
              Change the look and feel of the application.
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
                        <span className="text-sm font-medium">Theme</span>
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          themeOpen ? "rotate-90" : ""
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <ThemeToggle />
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
                          Accent Color
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
                    <AccentColorSwitcher />
                  </CollapsibleContent>
                </Collapsible>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-sm font-medium mb-3">Theme</h3>
                  <ThemeToggle />
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-3">Accent Color</h3>
                  <AccentColorSwitcher />
                </div>
              </>
            )}
          </CardContent>
        </Card>
        {user && user.groups && user.groups.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Group Selection
              </CardTitle>
              <CardDescription>
                Switch between your groups to view different financial data
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {group.name}
                      </span>
                      {isCurrentGroup && <Check className="w-4 h-4" />}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Update Credentials
            </CardTitle>
            <CardDescription>
              Change your username and password settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isMobile ? (
              <>
                <Collapsible open={usernameOpen} onOpenChange={setUsernameOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <UserCog className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Change Username
                        </span>
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          usernameOpen ? "rotate-90" : ""
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Update your public username (used for login).
                    </p>
                    <ChangeUsernameForm />
                  </CollapsibleContent>
                </Collapsible>
                <Collapsible open={passwordOpen} onOpenChange={setPasswordOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Change Password
                        </span>
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          passwordOpen ? "rotate-90" : ""
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Update your password (minimum 6 characters).
                    </p>
                    <ChangePasswordForm />
                  </CollapsibleContent>
                </Collapsible>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-sm font-medium mb-1">Change Username</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Update your public username (used for login).
                  </p>
                  <ChangeUsernameForm />
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-1">Change Password</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Update your password (minimum 6 characters).
                  </p>
                  <ChangePasswordForm />
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Laptop className="w-5 h-5" />
              Active Sessions
            </CardTitle>
            <CardDescription>
              Manage your active sessions across different devices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SessionsList />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

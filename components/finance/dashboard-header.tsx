"use client";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  EuroIcon,
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

export function DashboardHeader() {
  const { user, logout } = useAuth();
  const { privacyMode, isLoading: privacyLoading } = usePrivacy();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

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
          newPrivacyMode ? "Privacy mode enabled" : "Privacy mode disabled"
        );
        window.dispatchEvent(
          new CustomEvent("privacyModeUpdated", {
            detail: { privacyMode: newPrivacyMode },
          })
        );
      } else {
        toast.error("Failed to update privacy mode");
      }
    } catch (error) {
      console.error("Failed to toggle privacy mode:", error);
      toast.error("Error updating privacy mode");
    }
  };

  const navItems = [
    { href: "/manage", label: "Manage", icon: Edit },
    { href: "/", label: "Summary", icon: BarChart3 },
    { href: "/details", label: "Details", icon: FileSpreadsheet },
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
              <EuroIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-primary">
                Finance Tracker
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Take Control of Your Finances
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
                privacyMode ? "Disable Privacy Mode" : "Enable Privacy Mode"
              }
            >
              {privacyMode ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              {!isMobile && (
                <span className="text-sm">
                  {privacyMode ? "Private" : "Visible"}
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
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => router.push("/user")}
                  className="cursor-pointer"
                >
                  <User className="w-4 h-4 mr-2" />
                  Account Settings
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
                  onClick={handleLogout}
                  className="cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
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
    </header>
  );
}

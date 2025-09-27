"use client";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  EuroIcon,
  ChevronDown,
  Shield,
  User,
  Moon,
  Sun,
  Save,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Edit, BarChart3, FileSpreadsheet } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { GroupSelector } from "@/components/ui/group-selector";
import { toast } from "sonner";
import { Users } from "lucide-react";

export function DashboardHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
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
            {!isMobile && <GroupSelector />}
            {isMobile && user && user.groups && user.groups.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 p-2"
                  >
                    <Users className="w-4 h-4" />
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {user.groups.map((group) => (
                    <DropdownMenuItem
                      key={group.group_id}
                      onClick={async () => {
                        try {
                          const response = await fetch("/api/switch-group", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ groupId: group.group_id }),
                            credentials: "include",
                          });

                          if (response.ok) {
                            window.location.reload();
                          } else {
                            toast.error("Failed to switch group");
                          }
                        } catch (error) {
                          toast.error("Error switching group");
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {group.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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
                <DropdownMenuItem
                  onClick={toggleTheme}
                  className="cursor-pointer"
                >
                  {mounted && resolvedTheme === "dark" ? (
                    <Sun className="w-4 h-4 mr-2" />
                  ) : (
                    <Moon className="w-4 h-4 mr-2" />
                  )}
                  {mounted && resolvedTheme === "dark"
                    ? "Light Mode"
                    : "Dark Mode"}
                </DropdownMenuItem>
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

"use client";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, EuroIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { DarkModeToggle } from "@/components/ui/dark-mode-toggle";
import { useRouter, usePathname } from "next/navigation";
import { Edit, BarChart3, FileText } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export function DashboardHeader() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await logout();
    setTimeout(() => {
      router.push("/login");
    }, 100);
  };

  const navItems = [
    { href: "/", label: "Manage", icon: Edit },
    { href: "/summary", label: "Summary", icon: BarChart3 },
    { href: "/details", label: "Details", icon: FileText },
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
            {/* Desktop view */}
            <div className="hidden sm:flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {user?.username}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="transition-all duration-200 hover:scale-[1.02] touch-manipulation"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
            <DarkModeToggle />

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="sm:hidden touch-manipulation"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Desktop Navigation */}
        {!isMobile && (
          <nav className="hidden sm:flex justify-center gap-4 pt-2 border-t border-border/50 mt-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
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

        {/* Mobile menu */}
        <div
          className={cn(
            "sm:hidden transition-all duration-200 overflow-hidden",
            isMenuOpen ? "max-h-20 mt-3 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.username}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="transition-all duration-200 active:scale-[0.98] touch-manipulation"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

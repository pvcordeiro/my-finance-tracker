"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Edit, BarChart3, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { href: "/manage", label: "Manage", icon: Edit },
  { href: "/", label: "Summary", icon: BarChart3 },
  { href: "/details", label: "Details", icon: FileText },
];

export function MobileBottomNav() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const pathname = usePathname();

  if (!isMobile || !user || pathname === "/login" || pathname === "/admin")
    return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg">
      <div className="flex justify-around items-center h-16 px-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-2 px-1 text-xs font-medium transition-colors min-h-[44px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

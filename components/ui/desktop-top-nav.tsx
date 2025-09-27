"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Edit, BarChart3, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/manage", label: "Manage", icon: Edit },
  { href: "/", label: "Summary", icon: BarChart3 },
  { href: "/details", label: "Details", icon: FileSpreadsheet },
];

export function DesktopTopNav() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const pathname = usePathname();
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await fetch("/api/admin/session", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setAdminUser(data.admin);
        }
      } catch (error) {
        // ignore
      }
    };
    checkAdmin();
  }, []);

  if (isMobile || !user) return null;
  if (pathname === "/login") return null;
  if (pathname === "/admin" && !adminUser) return null;

  return (
    <nav className="fixed top-20 left-0 right-0 z-40 bg-background border-b border-border shadow-sm">
      <div className="flex items-center justify-center h-16 px-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center justify-center px-4 py-2 mx-2 text-sm font-medium transition-colors rounded-md",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="w-4 h-4 mr-2" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

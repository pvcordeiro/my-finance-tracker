"use client";

import { usePathname } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { AppNavigation } from "@/components/ui/app-navigation";

export function MobileBottomNav() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const pathname = usePathname();

  if (
    !isMobile ||
    !user ||
    pathname === "/login" ||
    pathname === "/admin" ||
    pathname === "/verify-email" ||
    pathname === "/email-confirmed" ||
    pathname === "/reset-password"
  ) {
    return null;
  }

  return <AppNavigation placement="mobile" />;
}

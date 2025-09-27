"use client";
import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { FullPageLoader } from "@/components/ui/loading";

interface AuthGateProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  disableRedirect?: boolean;
}

export function AuthGate({
  children,
  requireAdmin = false,
  disableRedirect,
}: AuthGateProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      if (!disableRedirect) {
        const qs = new URLSearchParams();
        if (path && path !== "/") qs.set("next", path);
        router.replace(`/login${qs.toString() ? `?${qs.toString()}` : ""}`);
      }
      return;
    }
    if (requireAdmin && !user.is_admin) {
      router.replace("/");
      return;
    }
  }, [user, isLoading, router, path, requireAdmin, disableRedirect]);

  if (isLoading || !user || (requireAdmin && !user.is_admin)) {
    return <FullPageLoader />;
  }

  return <>{children}</>;
}

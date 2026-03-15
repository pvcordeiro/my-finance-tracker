"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { FullPageLoader } from "@/components/ui/loading";
import { useEffect } from "react";
import { useOnline } from "@/hooks/use-online";
import { OfflineBlockedPage } from "@/components/pwa/offline-blocked-page";
import { MinimalPageHeader } from "@/components/pwa/minimal-page-header";
import { useLanguage } from "@/hooks/use-language";
import { Shield } from "lucide-react";

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const isOnline = useOnline();

  useEffect(() => {
    if (!isLoading && (!user || !user.is_admin)) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!user || !user.is_admin) {
    return null;
  }

  if (!isOnline) {
    return (
      <div className="min-h-dvh finance-gradient page-nav-padding">
        <MinimalPageHeader
          title={t("admin.title")}
          icon={<Shield className="w-4 h-4 sm:w-5 sm:h-5 text-destructive-foreground" />}
          iconBg="bg-destructive"
          titleColor="text-destructive"
        />
        <OfflineBlockedPage />
      </div>
    );
  }

  return <AdminDashboard />;
}

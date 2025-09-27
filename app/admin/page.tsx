"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { FullPageLoader } from "@/components/ui/loading";
import { useEffect } from "react";

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

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

  return <AdminDashboard />;
}

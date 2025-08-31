"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminProvider, useAdmin } from "@/hooks/use-admin";
import { AdminLogin } from "@/components/admin/admin-login";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { FullPageLoader } from "@/components/ui/loading";

function AdminPageContent() {
  const { adminUser, loginAdmin, isLoading } = useAdmin();
  const router = useRouter();
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowLoader(true), 100); // Delay spinner by 100ms
      return () => clearTimeout(timer);
    } else {
      setShowLoader(false);
    }
  }, [isLoading]);

  const handleLogin = async (username: string, password: string) => {
    const success = await loginAdmin(username, password);
    return success;
  };

  if (showLoader) {
    return <FullPageLoader message="Loading..." />;
  }

  if (!adminUser) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return <AdminDashboard />;
}

export default function AdminPage() {
  return (
    <AdminProvider>
      <AdminPageContent />
    </AdminProvider>
  );
}

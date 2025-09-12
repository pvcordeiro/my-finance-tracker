"use client";

import { useRouter } from "next/navigation";
import { AdminProvider, useAdmin } from "@/hooks/use-admin";
import { AdminLogin } from "@/components/admin/admin-login";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { FullPageLoader } from "@/components/ui/loading";

function AdminPageContent() {
  const { adminUser, loginAdmin, isLoading } = useAdmin();
  const router = useRouter();

  const handleLogin = async (username: string, password: string) => {
    const success = await loginAdmin(username, password);
    return success;
  };

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

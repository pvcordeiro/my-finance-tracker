"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AuthProvider } from "@/hooks/use-auth";
import { useFinanceData } from "@/hooks/use-finance-data";
import { DashboardHeader } from "@/components/finance/dashboard-header";
import { DetailsTable } from "@/components/finance/details-table";
import { DataManagement } from "@/components/finance/data-management";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, Settings, Edit, BarChart3 } from "lucide-react";

function DetailsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { data, saveData, setData } = useFinanceData();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen finance-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading details...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen finance-gradient">
      <DashboardHeader />
      <main className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              Financial Details
            </h1>
            <p className="text-muted-foreground">
              Detailed view and data management
            </p>
          </div>
        </div>
        <DetailsTable data={data} />
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <DetailsPage />
    </AuthProvider>
  );
}

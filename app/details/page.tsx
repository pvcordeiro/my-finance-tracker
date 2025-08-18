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

    const handleImportData = (importedData: any) => {
        setData(importedData);
        saveData();
    };

    const handleClearData = () => {
        setData({
            bankAmount: 0,
            incomes: [],
            expenses: [],
        });
        saveData();
    };

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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-primary">
                            Financial Details
                        </h1>
                        <p className="text-muted-foreground">
                            Detailed view and data management
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => router.push("/")}
                        className="transition-all duration-200 hover:scale-[1.02]"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Button>
                </div>

                <Tabs defaultValue="details" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger
                            value="details"
                            className="flex items-center gap-2"
                        >
                            <FileText className="w-4 h-4" />
                            Details View
                        </TabsTrigger>
                        <TabsTrigger
                            value="management"
                            className="flex items-center gap-2"
                        >
                            <Settings className="w-4 h-4" />
                            Data Management
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="details">
                        <DetailsTable data={data} />
                    </TabsContent>

                    <TabsContent value="management">
                        <DataManagement
                            data={data}
                            onImportData={handleImportData}
                            onClearData={handleClearData}
                        />
                    </TabsContent>
                </Tabs>

                {/* Fixed Action Buttons */}
                <div className="fixed bottom-4 right-4 flex flex-col gap-2">
                    <Button
                        variant="outline"
                        className="transition-all duration-200 hover:scale-[1.05]"
                        onClick={() => router.push("/")}
                    >
                        <Edit className="w-4 h-4 mr-2" />
                        Manage
                    </Button>
                    <Button
                        variant="outline"
                        className="transition-all duration-200 hover:scale-[1.05]"
                        onClick={() => router.push("/summary")}
                    >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Summary
                    </Button>
                </div>
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

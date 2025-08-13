"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { AuthProvider } from "@/hooks/use-auth"
import { useFinanceData } from "@/hooks/use-finance-data"
import { DashboardHeader } from "@/components/finance/dashboard-header"
import { SummaryTable } from "@/components/finance/summary-table"
import { SimpleChart } from "@/components/finance/simple-chart"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit, FileText } from "lucide-react"

function SummaryPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { data } = useFinanceData()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen finance-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading summary...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen finance-gradient">
      <DashboardHeader />
      <main className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Financial Summary</h1>
            <p className="text-muted-foreground">Your complete financial overview</p>
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

        <SimpleChart data={data} />
        <SummaryTable data={data} />

        {/* Fixed Action Buttons */}
        <div className="fixed bottom-4 right-4 flex flex-col gap-2">
          <Button
            variant="secondary"
            className="shadow-lg transition-all duration-200 hover:scale-[1.05]"
            onClick={() => router.push("/")}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="shadow-lg transition-all duration-200 hover:scale-[1.05] bg-transparent"
            onClick={() => router.push("/details")}
          >
            <FileText className="w-4 h-4 mr-2" />
            Details
          </Button>
        </div>
      </main>
    </div>
  )
}

export default function Page() {
  return (
    <AuthProvider>
      <SummaryPage />
    </AuthProvider>
  )
}

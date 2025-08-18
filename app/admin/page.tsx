"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminProvider, useAdmin } from "@/hooks/use-admin"
import { AdminLogin } from "@/components/admin/admin-login"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

function AdminPageContent() {
  const { adminUser, loginAdmin, isLoading } = useAdmin()
  const router = useRouter()

  const handleLogin = async (username: string, password: string) => {
    const success = await loginAdmin(username, password)
    return success
  }

  if (isLoading) {
    return (
      <div className="min-h-screen finance-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-destructive border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!adminUser) {
    return <AdminLogin onLogin={handleLogin} />
  }

  return <AdminDashboard />
}

export default function AdminPage() {
  return (
    <AdminProvider>
      <AdminPageContent />
    </AdminProvider>
  )
}

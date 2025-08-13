"use client"
import { useState } from "react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Trash2, AlertTriangle, CheckCircle } from "lucide-react"
import type { FinanceData } from "@/hooks/use-finance-data"

interface DataManagementProps {
  data: FinanceData
  onImportData: (data: FinanceData) => void
  onClearData: () => void
}

export function DataManagement({ data, onImportData, onClearData }: DataManagementProps) {
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle")
  const [importError, setImportError] = useState("")

  const exportData = () => {
    const dataStr = JSON.stringify(data, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `finance-data-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)

        // Validate imported data structure
        if (!validateFinanceData(importedData)) {
          setImportStatus("error")
          setImportError("Invalid file format. Please ensure the file contains valid finance data.")
          return
        }

        onImportData(importedData)
        setImportStatus("success")
        setImportError("")

        // Reset success message after 3 seconds
        setTimeout(() => setImportStatus("idle"), 3000)
      } catch (error) {
        setImportStatus("error")
        setImportError("Failed to parse JSON file. Please check the file format.")
      }
    }
    reader.readAsText(file)

    // Reset input
    event.target.value = ""
  }

  const validateFinanceData = (data: any): data is FinanceData => {
    if (typeof data !== "object" || data === null) return false

    // Check required properties
    if (typeof data.bankAmount !== "number") return false
    if (!Array.isArray(data.incomes) || !Array.isArray(data.expenses)) return false

    // Validate entries structure
    const validateEntries = (entries: any[]) => {
      return entries.every(
        (entry) =>
          typeof entry === "object" &&
          typeof entry.id === "string" &&
          typeof entry.description === "string" &&
          Array.isArray(entry.amounts) &&
          entry.amounts.length === 12 &&
          entry.amounts.every((amount: any) => typeof amount === "number"),
      )
    }

    return validateEntries(data.incomes) && validateEntries(data.expenses)
  }

  const handleClearData = () => {
    if (window.confirm("Are you sure you want to clear all data? This action cannot be undone.")) {
      onClearData()
    }
  }

  const getDataStats = () => {
    const totalIncomes = data.incomes.length
    const totalExpenses = data.expenses.length
    const totalEntries = totalIncomes + totalExpenses
    const dataSize = new Blob([JSON.stringify(data)]).size

    return {
      totalEntries,
      totalIncomes,
      totalExpenses,
      dataSize: (dataSize / 1024).toFixed(2) + " KB",
    }
  }

  const stats = getDataStats()

  return (
    <div className="space-y-6">
      {/* Data Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Data Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalEntries}</div>
              <div className="text-sm text-muted-foreground">Total Entries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{stats.totalIncomes}</div>
              <div className="text-sm text-muted-foreground">Income Entries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.totalExpenses}</div>
              <div className="text-sm text-muted-foreground">Expense Entries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{stats.dataSize}</div>
              <div className="text-sm text-muted-foreground">Data Size</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import/Export */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export */}
          <div className="space-y-2">
            <Label>Export Data</Label>
            <Button onClick={exportData} className="w-full transition-all duration-200 hover:scale-[1.02]">
              <Download className="w-4 h-4 mr-2" />
              Download Backup
            </Button>
            <p className="text-sm text-muted-foreground">
              Export your financial data as a JSON file for backup or transfer.
            </p>
          </div>

          {/* Import */}
          <div className="space-y-2">
            <Label htmlFor="import-file">Import Data</Label>
            <Input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleImport}
              className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-sm text-muted-foreground">Import financial data from a previously exported JSON file.</p>
          </div>

          {/* Import Status Messages */}
          {importStatus === "success" && (
            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800">
                Data imported successfully! Your financial data has been updated.
              </AlertDescription>
            </Alert>
          )}

          {importStatus === "error" && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}

          {/* Clear Data */}
          <div className="space-y-2 pt-4 border-t">
            <Label className="text-destructive">Danger Zone</Label>
            <Button
              variant="destructive"
              onClick={handleClearData}
              className="w-full transition-all duration-200 hover:scale-[1.02]"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Data
            </Button>
            <p className="text-sm text-muted-foreground">
              Permanently delete all financial data. This action cannot be undone.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

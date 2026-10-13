"use client";
import { useState } from "react";
import type React from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Database, Download, FileSpreadsheet, Trash2 } from "lucide-react";
import { parseFinanceBackup } from "@/lib/finance-backup";
import type { FinanceBackup } from "@/lib/finance-backup.types";
import type { FinanceData } from "@/hooks/use-finance-data";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { useRef } from "react";

interface DataManagementProps {
  data: FinanceData;
  onImportComplete: () => Promise<void>;
  onClearData: () => Promise<void>;
}

export function DataManagement({
  data,
  onImportComplete,
  onClearData,
}: DataManagementProps) {
  const { t } = useLanguage();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importedBackup, setImportedBackup] = useState<FinanceBackup | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const exportData = async () => {
    try {
      const response = await fetch("/api/data/export", { credentials: "include" });
      if (!response.ok) throw new Error("Export failed");
      const csv = await response.text();
      const dataBlob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `finance-tracker-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Finance CSV export failed:", error);
      toast.error(t("manage.failedToExportData"));
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 8_000_000) {
      toast.error(t("manage.backupTooLarge"));
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backup = parseFinanceBackup(String(e.target?.result ?? ""));
        setImportedBackup(backup);
        setImportDialogOpen(true);
      } catch (error) {
        console.error("Finance backup parse failed:", error);
        toast.error(t("manage.failedToParse"));
      }
    };
    reader.onerror = () => toast.error(t("manage.failedToParse"));
    reader.readAsText(file, "utf-8");

    event.target.value = "";
  };

  const confirmImport = async () => {
    if (!importedBackup || isImporting) return;
    setIsImporting(true);
    try {
      const response = await fetch("/api/data/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(importedBackup),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || t("manage.failedToImportData"));
      }

      await onImportComplete();
      setImportDialogOpen(false);
      setImportedBackup(null);
      toast.success(t("manage.dataImportedSuccessfully"));
    } catch (error) {
      console.error("Finance backup import failed:", error);
      toast.error(error instanceof Error ? error.message : t("manage.failedToImportData"));
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearData = () => {
    setClearDialogOpen(true);
  };

  const confirmClearData = async () => {
    try {
      await onClearData();
      setClearDialogOpen(false);
      toast.success(t("manage.allDataCleared"));
    } catch (error) {
      console.error("Clearing finance data failed:", error);
      toast.error(t("manage.failedToClearData"));
    }
  };

  const getDataStats = () => {
    const totalIncomes = data.incomes.length;
    const totalExpenses = data.expenses.length;
    const totalEntries = totalIncomes + totalExpenses;
    const dataSize = new Blob([JSON.stringify(data)]).size;

    return {
      totalEntries,
      totalIncomes,
      totalExpenses,
      dataSize: (dataSize / 1024).toFixed(2) + " KB",
    };
  };

  const stats = getDataStats();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t("manage.dataManagement")}
          </CardTitle>
          <CardDescription>{t("manage.exportBackupDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-lg border bg-muted/30 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {stats.totalEntries}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("manage.totalEntries")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-finance-positive">
                {stats.totalIncomes}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("manage.incomeEntries")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-finance-negative">
                {stats.totalExpenses}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("manage.expenseEntries")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {stats.dataSize}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("manage.dataSize")}
              </div>
            </div>
          </div>
          {/* Export */}
          <div className="space-y-2">
            <Label>{t("manage.exportData")}</Label>
            <Button
              onClick={exportData}
              className="w-full transition-all duration-200 hover:scale-[1.02]"
            >
              <Download className="w-4 h-4 mr-2" />
              {t("manage.downloadBackup")}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t("manage.exportBackupDescription")}
            </p>
          </div>

          {/* Import */}
          <div className="space-y-2">
            <Label>{t("manage.importData")}</Label>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => importInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {t("manage.chooseImportFile")}
            </Button>
            <Input
              id="import-file"
              ref={importInputRef}
              type="file"
              accept=".csv,text/csv"
              aria-label={t("manage.importBackupDescription")}
              onChange={handleImport}
              className="absolute h-px w-px overflow-hidden border-0 p-0"
              style={{ clip: "rect(0, 0, 0, 0)" }}
              tabIndex={-1}
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              {t("manage.importBackupDescription")}
            </p>
          </div>

          {/* Clear Data */}
          <div className="space-y-2 pt-4 border-t">
            <Label className="text-destructive">{t("manage.dangerZone")}</Label>
            <Button
              variant="destructive"
              onClick={handleClearData}
              className="w-full transition-all duration-200 hover:scale-[1.02]"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("manage.clearAllData")}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t("manage.clearDataDescription")}
            </p>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("manage.clearAllData")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("manage.clearDataConfirmation")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("manage.clearAllData")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          if (isImporting) return;
          setImportDialogOpen(open);
          if (!open) setImportedBackup(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("manage.restoreBackupTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("manage.restoreBackupDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {importedBackup && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p>{t("manage.backupEntriesCount").replace("{count}", String(importedBackup.entries.length))}</p>
              <p className="text-muted-foreground">
                {t("manage.backupMonthsCount").replace(
                  "{count}",
                  String(importedBackup.entries.reduce((total, entry) => total + entry.months.length, 0))
                )}
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImporting}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isImporting || !importedBackup}
              onClick={(event) => {
                event.preventDefault();
                void confirmImport();
              }}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {isImporting ? t("common.loading") : t("manage.restoreBackup")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

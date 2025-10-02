"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "./use-auth";
import type { FinanceEntry } from "@/components/finance/entry-form";

export interface FinanceData {
  bankAmount: number;
  incomes: FinanceEntry[];
  expenses: FinanceEntry[];
}

const defaultData: FinanceData = {
  bankAmount: 0,
  incomes: [],
  expenses: [],
};

function shiftDataForRollingMonths(amounts: number[]): number[] {
  const now = new Date();
  const currentMonth = now.getMonth();

  if (currentMonth === 0) {
    return amounts;
  }

  const shifted = [...amounts];
  const fromCurrentToEnd = shifted.slice(currentMonth);
  const fromStartToCurrent = shifted.slice(0, currentMonth);

  return [...fromCurrentToEnd, ...fromStartToCurrent];
}

function unshiftDataForStorage(amounts: number[]): number[] {
  const now = new Date();
  const currentMonth = now.getMonth();

  if (currentMonth === 0) {
    return amounts;
  }

  const unshifted = [...amounts];
  const fromCurrentMonthBack = unshifted.slice(-currentMonth);
  const restOfArray = unshifted.slice(0, -currentMonth);

  return [...fromCurrentMonthBack, ...restOfArray];
}

export type CommitResult =
  | { success: true }
  | { success: false; conflict?: true; error?: string };

async function fetchLatestEntriesNoCache(): Promise<{
  entries: any[];
  last_updated_user_id: number | null;
} | null> {
  try {
    const res = await fetch(`/api/entries?ts=${Date.now()}`, {
      credentials: "include",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return {
      entries: json.entries || [],
      last_updated_user_id: json.last_updated_user_id || null,
    };
  } catch (_e) {
    return null;
  }
}

export function useFinanceData() {
  const [data, setData] = useState<FinanceData>(defaultData);
  const [originalData, setOriginalData] = useState<FinanceData>(defaultData);
  const [lastUpdated, setLastUpdated] = useState<{
    bankAmount: { timestamp: string | null; userId: number | null };
    entries: { timestamp: string | null; userId: number | null };
  }>({
    bankAmount: { timestamp: null, userId: null },
    entries: { timestamp: null, userId: null },
  });

  const [hasBankChanges, setHasBankChanges] = useState(false);
  const [hasEntryChanges, setHasEntryChanges] = useState(false);

  const hasChanges = useMemo(
    () => hasBankChanges || hasEntryChanges,
    [hasBankChanges, hasEntryChanges]
  );
  const [isLoading, setIsLoading] = useState(true);
  const [conflictData, setConflictData] = useState<FinanceData | null>(null);

  const [conflictType, setConflictType] = useState<
    null | "bank" | "entries" | "all"
  >(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadDataFromServer();
    } else {
      setData(defaultData);
      setHasBankChanges(false);
      setHasEntryChanges(false);
      setIsLoading(false);
    }
  }, [user]);

  const loadDataFromServer = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const bankResponse = await fetch("/api/bank-amount", {
        credentials: "include",
      });

      if (!bankResponse.ok) {
        if (bankResponse.status === 401) {
          console.log("Authentication required for bank amount");
          return;
        }
        throw new Error(`Bank API error: ${bankResponse.status}`);
      }

      const bankData = await bankResponse.json();

      const entriesResponse = await fetch("/api/entries", {
        credentials: "include",
      });

      if (!entriesResponse.ok) {
        if (entriesResponse.status === 401) {
          console.log("Authentication required for entries");
          return;
        }
        throw new Error(`Entries API error: ${entriesResponse.status}`);
      }

      const entriesData = await entriesResponse.json();

      const entries = entriesData?.entries || [];

      const incomes = entries
        .filter((entry: any) => entry.type === "income")
        .map((entry: any) => ({
          id: entry.id.toString(),
          description: entry.name,
          amounts: shiftDataForRollingMonths(entry.amounts),
        }));

      const expenses = entries
        .filter((entry: any) => entry.type === "expense")
        .map((entry: any) => ({
          id: entry.id.toString(),
          description: entry.name,
          amounts: shiftDataForRollingMonths(entry.amounts),
        }));

      const loadedData = {
        bankAmount: bankData.amount || 0,
        incomes,
        expenses,
      };

      setData(loadedData);
      setOriginalData(loadedData);

      setHasBankChanges(false);
      setHasEntryChanges(false);

      const bankUpdated = bankData.updated_at || null;
      const bankUserId = bankData.last_updated_user_id || null;
      const entriesUpdated = entriesData.last_updated || null;
      const entriesUserId = entriesData.last_updated_user_id || null;

      setLastUpdated({
        bankAmount: { timestamp: bankUpdated, userId: bankUserId },
        entries: { timestamp: entriesUpdated, userId: entriesUserId },
      });
    } catch (error) {
      console.error("Error loading data from server:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkConflicts = async (): Promise<FinanceData | null> => {
    try {
      const bankResponse = await fetch("/api/bank-amount", {
        credentials: "include",
      });

      if (!bankResponse.ok) {
        if (bankResponse.status === 401) return null;
        throw new Error(`Bank API error: ${bankResponse.status}`);
      }

      const bankData = await bankResponse.json();

      const entriesResponse = await fetch("/api/entries", {
        credentials: "include",
      });

      if (!entriesResponse.ok) {
        if (entriesResponse.status === 401) return null;
        throw new Error(`Entries API error: ${entriesResponse.status}`);
      }

      const entriesData = await entriesResponse.json();

      const entries = entriesData?.entries || [];
      const currentIncomes = entries
        .filter((entry: any) => entry.type === "income")
        .map((entry: any) => ({
          id: entry.id.toString(),
          description: entry.name,
          amounts: shiftDataForRollingMonths(entry.amounts),
        }));

      const currentExpenses = entries
        .filter((entry: any) => entry.type === "expense")
        .map((entry: any) => ({
          id: entry.id.toString(),
          description: entry.name,
          amounts: shiftDataForRollingMonths(entry.amounts),
        }));

      const currentData = {
        bankAmount: bankData.amount || 0,
        incomes: currentIncomes,
        expenses: currentExpenses,
      };

      const hasBankConflict =
        currentData.bankAmount !== originalData.bankAmount &&
        bankData.last_updated_user_id !== user?.id;
      const hasIncomeConflict =
        JSON.stringify(currentData.incomes) !==
          JSON.stringify(originalData.incomes) &&
        entriesData.last_updated_user_id !== user?.id;
      const hasExpenseConflict =
        JSON.stringify(currentData.expenses) !==
          JSON.stringify(originalData.expenses) &&
        entriesData.last_updated_user_id !== user?.id;

      if (hasBankConflict || hasIncomeConflict || hasExpenseConflict) {
        return currentData;
      }

      return null;
    } catch (error) {
      console.error("Error checking conflicts:", error);
      return null;
    }
  };

  /**
   * Save ONLY the bank amount (no entries) -- used on blur of the bank amount input.
   */
  const saveBankAmount = async (
    dataToSave?: FinanceData,
    onSessionExpired?: () => void
  ) => {
    try {
      const currentData = dataToSave || data;

      if (currentData.bankAmount === originalData.bankAmount) {
        return { success: false } as const;
      }

      const bankResponseCheck = await fetch("/api/bank-amount", {
        credentials: "include",
      });
      if (bankResponseCheck.ok) {
        const serverBank = await bankResponseCheck.json();
        const serverAmount = serverBank.amount || 0;
        const lastUser = serverBank.last_updated_user_id || null;
        if (serverAmount === currentData.bankAmount) {
          setOriginalData((prev) => ({ ...prev, bankAmount: serverAmount }));
          setHasBankChanges(false);
          return { success: false } as const;
        }
        if (
          serverAmount !== originalData.bankAmount &&
          lastUser !== user?.id &&
          serverAmount !== currentData.bankAmount
        ) {
          setConflictData({
            bankAmount: serverAmount,
            incomes: originalData.incomes,
            expenses: originalData.expenses,
          });
          setConflictType("bank");
          return { conflict: true } as const;
        }
      }
      const bankResponse = await fetch("/api/bank-amount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: currentData.bankAmount }),
        credentials: "include",
      });
      if (!bankResponse.ok) {
        let errJson: any = null;
        try {
          errJson = await bankResponse.json();
        } catch {}
        if (bankResponse.status === 403 && errJson?.code === "no_group") {
          toast.warning(
            "You are not in any group. Please contact an administrator."
          );
          return { success: false } as const;
        }
        console.error(
          "Bank amount save failed:",
          errJson?.error || (await bankResponse.text())
        );
        if (bankResponse.status === 401 && onSessionExpired) {
          onSessionExpired();
          return;
        }
        throw new Error("Failed to save bank amount");
      }

      setOriginalData((prev) => ({
        ...prev,
        bankAmount: currentData.bankAmount,
      }));
      setHasBankChanges(false);
      return { success: true };
    } catch (error) {
      console.error("Error saving bank amount:", error);
      throw error;
    }
  };

  const commitEntryDescription = async (
    entryType: "incomes" | "expenses",
    id: string,
    newDescription: string
  ): Promise<CommitResult> => {
    const originalEntry = originalData[entryType].find((e) => e.id === id);
    if (originalEntry && originalEntry.description === newDescription) {
      return { success: false };
    }
    try {
      const latest = await fetchLatestEntriesNoCache();
      if (latest) {
        const target = latest.entries.find((e: any) => e.id.toString() === id);
        const originalEntry = originalData[entryType].find((e) => e.id === id);

        if (!target && originalEntry) {
          const incomesServer = latest.entries
            .filter((e: any) => e.type === "income")
            .map((e: any) => ({
              id: e.id.toString(),
              description: e.name,
              amounts: shiftDataForRollingMonths(e.amounts),
            }));
          const expensesServer = latest.entries
            .filter((e: any) => e.type === "expense")
            .map((e: any) => ({
              id: e.id.toString(),
              description: e.name,
              amounts: shiftDataForRollingMonths(e.amounts),
            }));
          setConflictData({
            bankAmount: originalData.bankAmount,
            incomes: incomesServer,
            expenses: expensesServer,
          });
          setConflictType("entries");
          return { success: false, conflict: true };
        }
        if (target && originalEntry) {
          const serverName = target.name;

          if (
            serverName !== originalEntry.description &&
            serverName !== newDescription
          ) {
            const incomesServer = latest.entries
              .filter((e: any) => e.type === "income")
              .map((e: any) => ({
                id: e.id.toString(),
                description: e.name,
                amounts: shiftDataForRollingMonths(e.amounts),
              }));
            const expensesServer = latest.entries
              .filter((e: any) => e.type === "expense")
              .map((e: any) => ({
                id: e.id.toString(),
                description: e.name,
                amounts: shiftDataForRollingMonths(e.amounts),
              }));
            setConflictData({
              bankAmount: originalData.bankAmount,
              incomes: incomesServer,
              expenses: expensesServer,
            });
            setConflictType("entries");
            return { success: false, conflict: true };
          }
        }
      }
      const res = await fetch("/api/entries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: newDescription }),
        credentials: "include",
      });
      if (!res.ok) {
        let errJson: any = null;
        try {
          errJson = await res.json();
        } catch {}
        if (res.status === 403 && errJson?.code === "no_group") {
          toast.warning(
            "You are not in any group. Please contact an administrator."
          );
          return { success: false } as const;
        }
        throw new Error(errJson?.error || (await res.text()));
      }

      setOriginalData((prev) => ({
        ...prev,
        [entryType]: prev[entryType].map((e) =>
          e.id === id ? { ...e, description: newDescription } : e
        ),
      }));

      setHasEntryChanges(false);
      return { success: true } as const;
    } catch (e) {
      console.error("Description commit failed", e);
      return { success: false, error: (e as Error).message };
    }
  };

  const commitEntryAmount = async (
    entryType: "incomes" | "expenses",
    id: string,
    monthIndex: number,
    amount: number
  ): Promise<CommitResult> => {
    const originalEntry = originalData[entryType].find((e) => e.id === id);
    if (originalEntry && originalEntry.amounts[monthIndex] === amount) {
      return { success: false };
    }
    try {
      const currentYear = new Date().getFullYear();

      const currentMonth = new Date().getMonth();
      const actualMonth = (currentMonth + monthIndex) % 12;
      const latest = await fetchLatestEntriesNoCache();
      if (latest) {
        const target = latest.entries.find((e: any) => e.id.toString() === id);
        const originalEntry = originalData[entryType].find((e) => e.id === id);
        if (!target && originalEntry) {
          const incomesServer = latest.entries
            .filter((e: any) => e.type === "income")
            .map((e: any) => ({
              id: e.id.toString(),
              description: e.name,
              amounts: shiftDataForRollingMonths(e.amounts),
            }));
          const expensesServer = latest.entries
            .filter((e: any) => e.type === "expense")
            .map((e: any) => ({
              id: e.id.toString(),
              description: e.name,
              amounts: shiftDataForRollingMonths(e.amounts),
            }));
          setConflictData({
            bankAmount: originalData.bankAmount,
            incomes: incomesServer,
            expenses: expensesServer,
          });
          setConflictType("entries");
          return { success: false, conflict: true };
        }
        if (target && originalEntry) {
          const serverShifted = shiftDataForRollingMonths(target.amounts);
          const serverValue = serverShifted[monthIndex];
          const originalValue = originalEntry.amounts[monthIndex];
          if (serverValue !== originalValue && serverValue !== amount) {
            const incomesServer = latest.entries
              .filter((e: any) => e.type === "income")
              .map((e: any) => ({
                id: e.id.toString(),
                description: e.name,
                amounts: shiftDataForRollingMonths(e.amounts),
              }));
            const expensesServer = latest.entries
              .filter((e: any) => e.type === "expense")
              .map((e: any) => ({
                id: e.id.toString(),
                description: e.name,
                amounts: shiftDataForRollingMonths(e.amounts),
              }));
            setConflictData({
              bankAmount: originalData.bankAmount,
              incomes: incomesServer,
              expenses: expensesServer,
            });
            setConflictType("entries");
            return { success: false, conflict: true };
          }
        }
      }
      const res = await fetch("/api/entries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          month: actualMonth + 1,
          amount,
          year: currentYear,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        let errJson: any = null;
        try {
          errJson = await res.json();
        } catch {}
        if (res.status === 403 && errJson?.code === "no_group") {
          toast.warning(
            "You are not in any group. Please contact an administrator."
          );
          return { success: false } as const;
        }
        throw new Error(errJson?.error || (await res.text()));
      }
      setOriginalData((prev) => ({
        ...prev,
        [entryType]: prev[entryType].map((e) => {
          if (e.id === id) {
            const newAmounts = [...e.amounts];
            newAmounts[monthIndex] = amount;
            return { ...e, amounts: newAmounts };
          }
          return e;
        }),
      }));
      setHasEntryChanges(false);
      return { success: true } as const;
    } catch (e) {
      console.error("Amount commit failed", e);
      return { success: false, error: (e as Error).message };
    }
  };

  const updateBankAmount = (amount: number) => {
    setData((prev) => {
      const next = { ...prev, bankAmount: amount };

      const bankChanged = next.bankAmount !== originalData.bankAmount;
      setHasBankChanges(bankChanged);
      return next;
    });
  };

  const addEntry = (type: "incomes" | "expenses") => {
    (async () => {
      try {
        const res = await fetch("/api/entries/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: type === "incomes" ? "income" : "expense",
            name: "",
          }),
          credentials: "include",
        });
        if (!res.ok) {
          let errJson: any = null;
          try {
            errJson = await res.json();
          } catch {}
          if (res.status === 403 && errJson?.code === "no_group") {
            toast.warning(
              "You are not in any group. Please contact an administrator."
            );
            return;
          }
          console.error(
            "Failed to create entry",
            errJson?.error || (await res.text())
          );
          return;
        }
        const json = await res.json();
        const serverId = json.id.toString();
        const newEntry: FinanceEntry = {
          id: serverId,
          description: "",
          amounts: new Array(12).fill(0),
        };
        setData((prev) => ({ ...prev, [type]: [...prev[type], newEntry] }));
        setOriginalData((prev) => ({
          ...prev,
          [type]: [...prev[type], newEntry],
        }));
        setHasEntryChanges(true);
      } catch (e) {
        console.error("Create entry exception", e);
      }
    })();
  };

  const updateEntry = (
    type: "incomes" | "expenses",
    id: string,
    field: string,
    value: string | number,
    monthIndex?: number
  ) => {
    setData((prev) => {
      const updatedList = prev[type].map((entry) => {
        if (entry.id === id) {
          if (field === "description") {
            return { ...entry, description: value as string };
          } else if (field === "amount" && monthIndex !== undefined) {
            const newAmounts = [...entry.amounts];
            newAmounts[monthIndex] = value as number;
            return { ...entry, amounts: newAmounts };
          }
        }
        return entry;
      });
      const next = { ...prev, [type]: updatedList } as FinanceData;

      const compareEntries = (
        current: FinanceEntry[],
        original: FinanceEntry[]
      ) => {
        if (current.length !== original.length) return true;
        for (let i = 0; i < current.length; i++) {
          const c = current[i];
          const o = original[i];
          if (!o || c.id !== o.id) return true;
          if (c.description !== o.description) return true;
          for (let m = 0; m < 12; m++) {
            if ((c.amounts[m] || 0) !== (o.amounts[m] || 0)) return true;
          }
        }
        return false;
      };
      const incomesChanged = compareEntries(
        type === "incomes" ? updatedList : next.incomes,
        originalData.incomes
      );
      const expensesChanged = compareEntries(
        type === "expenses" ? updatedList : next.expenses,
        originalData.expenses
      );
      setHasEntryChanges(incomesChanged || expensesChanged);
      return next;
    });
  };

  const removeEntry = async (type: "incomes" | "expenses", id: string) => {
    try {
      const response = await fetch(`/api/entries?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404) {
          await loadDataFromServer();
          return;
        }
        throw new Error(errorData.error || "Failed to delete entry");
      }

      setData((prev) => ({
        ...prev,
        [type]: prev[type].filter((entry) => entry.id !== id),
      }));
      setOriginalData((prev) => ({
        ...prev,
        [type]: prev[type].filter((entry) => entry.id !== id),
      }));
      setHasEntryChanges(false);
    } catch (error) {
      console.error("Error deleting entry:", error);
      throw error;
    }
  };

  const forceSaveData = async (
    dataToSave?: FinanceData,
    onSessionExpired?: () => void
  ) => {
    try {
      const currentData = dataToSave || data;

      const bankResponse = await fetch("/api/bank-amount", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: currentData.bankAmount,
        }),
        credentials: "include",
      });

      if (!bankResponse.ok) {
        let errJson: any = null;
        try {
          errJson = await bankResponse.json();
        } catch {}
        if (bankResponse.status === 403 && errJson?.code === "no_group") {
          toast.warning(
            "You are not in any group. Please contact an administrator."
          );
          return { success: false } as const;
        }
        if (bankResponse.status === 401) {
          if (onSessionExpired) onSessionExpired();
          return;
        }
        console.error(
          "Bank amount save failed:",
          errJson?.error || (await bankResponse.text())
        );
      }

      const allEntries = [
        ...currentData.incomes
          .filter((entry) => entry.description.trim() !== "")
          .map((entry) => ({
            name: entry.description,
            type: "income",
            amounts: unshiftDataForStorage(entry.amounts),
          })),
        ...currentData.expenses
          .filter((entry) => entry.description.trim() !== "")
          .map((entry) => ({
            name: entry.description,
            type: "expense",
            amounts: unshiftDataForStorage(entry.amounts),
          })),
      ];

      const entriesResponse = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entries: allEntries,
        }),
        credentials: "include",
      });

      if (!entriesResponse.ok) {
        let errJson: any = null;
        try {
          errJson = await entriesResponse.json();
        } catch {}
        if (entriesResponse.status === 403 && errJson?.code === "no_group") {
          toast.warning(
            "You are not in any group. Please contact an administrator."
          );
          return { success: false } as const;
        }
        const errorText = errJson?.error || (await entriesResponse.text());
        console.error("Entries save failed:", errorText);
        throw new Error(`Failed to save entries: ${errorText}`);
      }

      setHasBankChanges(false);
      setHasEntryChanges(false);
      setConflictData(null);
      setConflictType(null);
      await loadDataFromServer();
      return { success: true };
    } catch (error) {
      console.error("Error force saving data to server:", error);
      throw error;
    }
  };

  const cancelConflict = () => {
    setConflictData(null);
    setConflictType(null);
  };

  const setDataForImport = async (
    newData: FinanceData,
    saveImmediately = false
  ) => {
    setData(newData);
    setHasBankChanges(true);
    setHasEntryChanges(true);

    if (saveImmediately) {
      await forceSaveData(newData);
    }
  };

  /**
   * Add an amount to the bank balance atomically
   */
  const addToBankAmount = async (delta: number) => {
    if (delta <= 0) return;

    try {
      const response = await fetch("/api/bank-amount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "adjust", delta }),
        credentials: "include",
      });

      if (!response.ok) {
        let errJson: any = null;
        try {
          errJson = await response.json();
        } catch {}
        if (response.status === 403 && errJson?.code === "no_group") {
          toast.warning(
            "You are not in any group. Please contact an administrator."
          );
          return;
        }
        throw new Error("Failed to add to bank amount");
      }

      const result = await response.json();
      setData((prev) => ({ ...prev, bankAmount: result.amount }));
      setOriginalData((prev) => ({ ...prev, bankAmount: result.amount }));
      setHasBankChanges(false);
      toast.success(`Added €${delta.toFixed(2)} to bank balance`);
    } catch (error) {
      console.error("Error adding to bank amount:", error);
      toast.error("Failed to add to bank amount");
    }
  };

  /**
   * Subtract an amount from the bank balance atomically
   */
  const subtractFromBankAmount = async (delta: number) => {
    if (delta <= 0) return;

    try {
      const response = await fetch("/api/bank-amount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "adjust", delta: -delta }),
        credentials: "include",
      });

      if (!response.ok) {
        let errJson: any = null;
        try {
          errJson = await response.json();
        } catch {}
        if (response.status === 403 && errJson?.code === "no_group") {
          toast.warning(
            "You are not in any group. Please contact an administrator."
          );
          return;
        }
        throw new Error("Failed to subtract from bank amount");
      }

      const result = await response.json();
      setData((prev) => ({ ...prev, bankAmount: result.amount }));
      setOriginalData((prev) => ({ ...prev, bankAmount: result.amount }));
      setHasBankChanges(false);
      toast.success(`Subtracted €${delta.toFixed(2)} from bank balance`);
    } catch (error) {
      console.error("Error subtracting from bank amount:", error);
      toast.error("Failed to subtract from bank amount");
    }
  };

  return {
    data,
    hasChanges,

    hasBankChanges,
    hasEntryChanges,
    isLoading,
    conflictData,
    conflictType,
    saveBankAmount,
    commitEntryDescription,
    commitEntryAmount,
    forceSaveData,
    cancelConflict,
    updateBankAmount,
    addEntry,
    updateEntry,
    removeEntry,
    setData: setDataForImport,
    refreshData: loadDataFromServer,
    addToBankAmount,
    subtractFromBankAmount,
  };
}

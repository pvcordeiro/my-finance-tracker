"use client";

import { useState, useEffect } from "react";
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
  const currentMonth = now.getMonth(); // 0-11

  if (currentMonth === 0) {
    return amounts;
  }

  const unshifted = [...amounts];
  const fromCurrentMonthBack = unshifted.slice(-currentMonth);
  const restOfArray = unshifted.slice(0, -currentMonth);

  return [...fromCurrentMonthBack, ...restOfArray];
}

export function useFinanceData() {
  const [data, setData] = useState<FinanceData>(defaultData);
  const [originalData, setOriginalData] = useState<FinanceData>(defaultData);
  const [lastUpdated, setLastUpdated] = useState<{
    bankAmount: string | null;
    entries: string | null;
  }>({
    bankAmount: null,
    entries: null,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [conflictData, setConflictData] = useState<FinanceData | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadDataFromServer();
    } else {
      setData(defaultData);
      setHasChanges(false);
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

      // Load bank amount
      const bankResponse = await fetch("/api/bank-amount", {
        credentials: "include", // Include cookies for session
      });

      if (!bankResponse.ok) {
        if (bankResponse.status === 401) {
          console.log("Authentication required for bank amount");
          return;
        }
        throw new Error(`Bank API error: ${bankResponse.status}`);
      }

      const bankData = await bankResponse.json();

      // Load entries
      const entriesResponse = await fetch("/api/entries", {
        credentials: "include", // Include cookies for session
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

      // Transform entries to match frontend format and shift data for rolling months
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

      const bankUpdated = bankData.updated_at || null;
      const entriesUpdated = entriesData.last_updated || null; // We'll need to add this to the API

      setLastUpdated({
        bankAmount: bankUpdated,
        entries: entriesUpdated,
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
        currentData.bankAmount !== originalData.bankAmount;
      const hasIncomeConflict =
        JSON.stringify(currentData.incomes) !==
        JSON.stringify(originalData.incomes);
      const hasExpenseConflict =
        JSON.stringify(currentData.expenses) !==
        JSON.stringify(originalData.expenses);

      if (hasBankConflict || hasIncomeConflict || hasExpenseConflict) {
        return currentData;
      }

      return null;
    } catch (error) {
      console.error("Error checking conflicts:", error);
      return null;
    }
  };

  const saveData = async (
    dataToSave?: FinanceData,
    onSessionExpired?: () => void
  ) => {
    try {
      const currentData = dataToSave || data;

      const conflictingData = await checkConflicts();
      if (conflictingData) {
        setConflictData(conflictingData);
        return { conflict: true, conflictingData };
      }

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
        console.error("Bank amount save failed:", await bankResponse.text());
        if (bankResponse.status === 401) {
          if (onSessionExpired) onSessionExpired();
          return;
        }
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
        const errorText = await entriesResponse.text();
        console.error("Entries save failed:", errorText);
        throw new Error(`Failed to save entries: ${errorText}`);
      }

      setHasChanges(false);
      return { success: true };
    } catch (error) {
      console.error("Error saving data to server:", error);
      throw error;
    }
  };

  const updateBankAmount = (amount: number) => {
    setData((prev) => ({ ...prev, bankAmount: amount }));
    setHasChanges(true);
  };

  const addEntry = (type: "incomes" | "expenses") => {
    const newEntry: FinanceEntry = {
      id: Date.now().toString(),
      description: "",
      amounts: new Array(12).fill(0),
    };
    setData((prev) => ({
      ...prev,
      [type]: [...prev[type], newEntry],
    }));
    setHasChanges(true);
  };

  const updateEntry = (
    type: "incomes" | "expenses",
    id: string,
    field: string,
    value: string | number,
    monthIndex?: number
  ) => {
    setData((prev) => ({
      ...prev,
      [type]: prev[type].map((entry) => {
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
      }),
    }));
    setHasChanges(true);
  };

  const removeEntry = async (type: "incomes" | "expenses", id: string) => {
    try {
      const response = await fetch(`/api/entries?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete entry");
      }

      setData((prev) => ({
        ...prev,
        [type]: prev[type].filter((entry) => entry.id !== id),
      }));
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
        console.error("Bank amount save failed:", await bankResponse.text());
        if (bankResponse.status === 401) {
          if (onSessionExpired) onSessionExpired();
          return;
        }
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
        const errorText = await entriesResponse.text();
        console.error("Entries save failed:", errorText);
        throw new Error(`Failed to save entries: ${errorText}`);
      }

      setHasChanges(false);
      setConflictData(null);
      await loadDataFromServer();
      return { success: true };
    } catch (error) {
      console.error("Error force saving data to server:", error);
      throw error;
    }
  };

  const cancelConflict = () => {
    setConflictData(null);
  };

  const setDataForImport = async (
    newData: FinanceData,
    saveImmediately = false
  ) => {
    setData(newData);
    setHasChanges(true);

    if (saveImmediately) {
      await saveData(newData);
    }
  };

  return {
    data,
    hasChanges,
    isLoading,
    conflictData,
    saveData,
    forceSaveData,
    cancelConflict,
    updateBankAmount,
    addEntry,
    updateEntry,
    removeEntry,
    setData: setDataForImport,
    refreshData: loadDataFromServer,
  };
}

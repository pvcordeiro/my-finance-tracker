"use client"

import { useState, useEffect } from "react"
import { useAuth } from "./use-auth"
import type { FinanceEntry } from "@/components/finance/entry-form"

export interface FinanceData {
  bankAmount: number
  incomes: FinanceEntry[]
  expenses: FinanceEntry[]
}

const defaultData: FinanceData = {
  bankAmount: 0,
  incomes: [],
  expenses: [],
}

export function useFinanceData() {
  const [data, setData] = useState<FinanceData>(defaultData)
  const [hasChanges, setHasChanges] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      loadDataFromServer()
    }
  }, [user])

  const loadDataFromServer = async () => {
    try {
      setIsLoading(true)

      // Load bank amount
      const bankResponse = await fetch(`/api/bank-amount?userId=${user?.id || 1}`)
      const bankData = await bankResponse.json()

      // Load entries
      const entriesResponse = await fetch(`/api/entries?userId=${user?.id || 1}`)
      const entriesData = await entriesResponse.json()

      // Transform entries to match frontend format
      const incomes = entriesData.entries
        .filter((entry: any) => entry.type === "income")
        .map((entry: any) => ({
          id: entry.id.toString(),
          description: entry.name,
          amounts: entry.amounts,
        }))

      const expenses = entriesData.entries
        .filter((entry: any) => entry.type === "expense")
        .map((entry: any) => ({
          id: entry.id.toString(),
          description: entry.name,
          amounts: entry.amounts,
        }))

      setData({
        bankAmount: bankData.amount || 0,
        incomes,
        expenses,
      })
    } catch (error) {
      console.error("Error loading data from server:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveData = async (dataToSave?: FinanceData) => {
    try {
      const userId = user?.id || 1
      const currentData = dataToSave || data

      // Save bank amount
      const bankResponse = await fetch("/api/bank-amount", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: currentData.bankAmount,
          userId,
        }),
      })

      if (!bankResponse.ok) {
        console.error("Bank amount save failed:", await bankResponse.text())
      }

      // Transform and save entries (only save entries with descriptions)
      const allEntries = [
        ...currentData.incomes
          .filter((entry) => entry.description.trim() !== "")
          .map((entry) => ({
            name: entry.description,
            type: "income",
            amounts: JSON.stringify(entry.amounts),
          })),
        ...currentData.expenses
          .filter((entry) => entry.description.trim() !== "")
          .map((entry) => ({
            name: entry.description,
            type: "expense",
            amounts: JSON.stringify(entry.amounts),
          })),
      ]

      const entriesResponse = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entries: allEntries,
          userId,
        }),
      })

      if (!entriesResponse.ok) {
        const errorText = await entriesResponse.text()
        console.error("Entries save failed:", errorText)
        throw new Error(`Failed to save entries: ${errorText}`)
      }

      setHasChanges(false)
    } catch (error) {
      console.error("Error saving data to server:", error)
      throw error // Re-throw so UI can handle it
    }
  }

  const updateBankAmount = (amount: number) => {
    setData((prev) => ({ ...prev, bankAmount: amount }))
    setHasChanges(true)
  }

  const addEntry = (type: "incomes" | "expenses") => {
    const newEntry: FinanceEntry = {
      id: Date.now().toString(),
      description: "",
      amounts: new Array(12).fill(0),
    }
    setData((prev) => ({
      ...prev,
      [type]: [...prev[type], newEntry],
    }))
    setHasChanges(true)
  }

  const updateEntry = (
    type: "incomes" | "expenses",
    id: string,
    field: string,
    value: string | number,
    monthIndex?: number,
  ) => {
    setData((prev) => ({
      ...prev,
      [type]: prev[type].map((entry) => {
        if (entry.id === id) {
          if (field === "description") {
            return { ...entry, description: value as string }
          } else if (field === "amount" && monthIndex !== undefined) {
            const newAmounts = [...entry.amounts]
            newAmounts[monthIndex] = value as number
            return { ...entry, amounts: newAmounts }
          }
        }
        return entry
      }),
    }))
    setHasChanges(true)
  }

  const removeEntry = (type: "incomes" | "expenses", id: string) => {
    setData((prev) => ({
      ...prev,
      [type]: prev[type].filter((entry) => entry.id !== id),
    }))
    setHasChanges(true)
  }

  const setDataForImport = async (newData: FinanceData, saveImmediately = false) => {
    setData(newData)
    setHasChanges(true)
    
    if (saveImmediately) {
      await saveData(newData)
    }
  }

  return {
    data,
    hasChanges,
    isLoading,
    saveData,
    updateBankAmount,
    addEntry,
    updateEntry,
    removeEntry,
    setData: setDataForImport,
    refreshData: loadDataFromServer,
  }
}

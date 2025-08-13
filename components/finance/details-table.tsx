"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"
import type { FinanceData } from "@/hooks/use-finance-data"

interface DetailsTableProps {
  data: FinanceData
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function getRollingMonths(): Array<{ label: string; year: number; month: number }> {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const months = []

  for (let i = 0; i < 12; i++) {
    const monthIndex = (currentMonth + i) % 12
    const year = currentYear + Math.floor((currentMonth + i) / 12)
    months.push({
      label: MONTHS[monthIndex],
      year,
      month: monthIndex,
    })
  }

  return months
}

export function DetailsTable({ data }: DetailsTableProps) {
  const months = getRollingMonths()
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  return (
    <div className="space-y-6">
      {/* Income Details */}
      <Card className="income-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-700">
            <TrendingUp className="w-5 h-5" />
            Income Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b bg-emerald-50">
                  <th className="sticky left-0 bg-emerald-100 text-left p-3 font-semibold border-r min-w-[200px] z-10">
                    Description
                  </th>
                  {months.map((month) => (
                    <th key={month.label} className="text-center p-3 font-semibold min-w-[100px]">
                      <div className="flex flex-col items-center">
                        <span>{month.label}</span>
                        {month.year === currentYear && month.month === currentMonth && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            Current
                          </Badge>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Bank Amount Row */}
                {data.bankAmount > 0 && (
                  <tr className="border-b hover:bg-emerald-25 transition-colors">
                    <td className="sticky left-0 bg-white p-3 font-medium border-r z-10">Bank Amount</td>
                    {months.map((month) => (
                      <td key={month.label} className="text-center p-3">
                        {month.year === currentYear && month.month === currentMonth ? (
                          <span className="font-bold text-emerald-600">€{data.bankAmount.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )}
                {/* Income Entries */}
                {data.incomes.map((income) => (
                  <tr key={income.id} className="border-b hover:bg-emerald-25 transition-colors">
                    <td className="sticky left-0 bg-white p-3 font-medium border-r z-10">
                      {income.description || "(No description)"}
                    </td>
                    {months.map((month) => {
                      const amount = income.amounts[month.month] || 0
                      return (
                        <td key={month.label} className="text-center p-3">
                          {amount > 0 ? (
                            <span className="font-medium text-emerald-600">€{amount.toFixed(2)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {data.incomes.length === 0 && (
                  <tr>
                    <td colSpan={13} className="text-center p-8 text-muted-foreground">
                      No income entries found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Expense Details */}
      <Card className="expense-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <TrendingDown className="w-5 h-5" />
            Expense Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b bg-red-50">
                  <th className="sticky left-0 bg-red-100 text-left p-3 font-semibold border-r min-w-[200px] z-10">
                    Description
                  </th>
                  {months.map((month) => (
                    <th key={month.label} className="text-center p-3 font-semibold min-w-[100px]">
                      <div className="flex flex-col items-center">
                        <span>{month.label}</span>
                        {month.year === currentYear && month.month === currentMonth && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            Current
                          </Badge>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((expense) => (
                  <tr key={expense.id} className="border-b hover:bg-red-25 transition-colors">
                    <td className="sticky left-0 bg-white p-3 font-medium border-r z-10">
                      {expense.description || "(No description)"}
                    </td>
                    {months.map((month) => {
                      const amount = expense.amounts[month.month] || 0
                      return (
                        <td key={month.label} className="text-center p-3">
                          {amount > 0 ? (
                            <span className="font-medium text-red-600">€{amount.toFixed(2)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {data.expenses.length === 0 && (
                  <tr>
                    <td colSpan={13} className="text-center p-8 text-muted-foreground">
                      No expense entries found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

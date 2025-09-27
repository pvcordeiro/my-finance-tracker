"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, EuroIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FinanceData } from "@/hooks/use-finance-data";

interface SummaryTableProps {
  data: FinanceData;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getRollingMonths(): Array<{
  label: string;
  year: number;
  month: number;
}> {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const months = [];

  for (let i = 0; i < 12; i++) {
    const monthIndex = (currentMonth + i) % 12;
    const year = currentYear + Math.floor((currentMonth + i) / 12);
    months.push({
      label: MONTHS[monthIndex],
      year,
      month: monthIndex,
    });
  }

  return months;
}

export function SummaryTable({ data }: SummaryTableProps) {
  if (!data || (!data.incomes && !data.expenses)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const months = getRollingMonths();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let annualIncome = 0;
  let annualExpenses = 0;
  let runningBalance = 0;
  let prevBalance = 0;

  const monthlyData = months.map((month, index) => {
    let totalIncome = 0;
    let totalExpenses = 0;

    if (data.incomes) {
      data.incomes.forEach((income) => {
        const amount = income.amounts[index] || 0;
        totalIncome += amount;
      });
    }

    if (data.expenses) {
      data.expenses.forEach((expense) => {
        const amount = expense.amounts[index] || 0;
        totalExpenses += amount;
      });
    }

    let bankAmount = 0;
    if (month.year === currentYear && month.month === currentMonth) {
      bankAmount = data.bankAmount || 0;
    }

    const net = totalIncome - totalExpenses;

    if (
      month.year < currentYear ||
      (month.year === currentYear && month.month < currentMonth)
    ) {
      prevBalance += net;
      runningBalance = prevBalance;
    } else if (month.year === currentYear && month.month === currentMonth) {
      runningBalance = prevBalance + net + bankAmount;
    } else {
      runningBalance += net;
    }

    annualIncome += totalIncome;
    annualExpenses += totalExpenses;

    return {
      month: month.label,
      income: totalIncome,
      expenses: totalExpenses,
      net,
      balance: runningBalance,
      isCurrentMonth:
        month.year === currentYear && month.month === currentMonth,
    };
  });

  const finalBalance = monthlyData[monthlyData.length - 1]?.balance || 0;
  const currentBalance =
    monthlyData.find((m) => m.isCurrentMonth)?.balance || 0;
  const nextMonthBalance = monthlyData[1]?.balance || 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-accent/10 border-primary/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <EuroIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-primary text-shadow-sm">
                  Current Month
                </p>
                <p
                  className={cn(
                    "text-lg sm:text-2xl font-bold truncate text-shadow-sm",
                    currentBalance >= 0 ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  €{currentBalance.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-accent/10 border-primary/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <EuroIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-primary text-shadow-sm">
                  Next Month
                </p>
                <p
                  className={cn(
                    "text-lg sm:text-2xl font-bold truncate text-shadow-sm",
                    nextMonthBalance >= 0 ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  €{nextMonthBalance.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="income-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-emerald-700 text-shadow-sm">
                  1 Year Income
                </p>
                <p className="text-lg sm:text-2xl font-bold text-emerald-800 truncate text-shadow-sm">
                  €{annualIncome.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="expense-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-red-700 text-shadow-sm">
                  1 Year Expense
                </p>
                <p className="text-lg sm:text-2xl font-bold text-red-800 truncate text-shadow-sm">
                  €{annualExpenses.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <EuroIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            Monthly Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[340px] border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-2 py-2 font-semibold min-w-0 whitespace-nowrap">
                    Month
                  </th>
                  <th className="text-right px-2 py-2 font-semibold text-emerald-700 min-w-0 whitespace-nowrap">
                    Income
                  </th>
                  <th className="text-right px-2 py-2 font-semibold text-red-700 min-w-0 whitespace-nowrap">
                    Expenses
                  </th>
                  <th className="text-right px-2 py-2 font-semibold min-w-0 whitespace-nowrap">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((row, index) => (
                  <tr
                    key={row.month}
                    className={cn(
                      "border-b hover:bg-muted/30 transition-colors",
                      row.isCurrentMonth && "bg-primary/5 border-primary/20"
                    )}
                  >
                    <td className="px-2 py-2 font-medium min-w-0">
                      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                        <span className="text-xs sm:text-base min-w-0">
                          {row.month}
                        </span>
                        {row.isCurrentMonth && (
                          <Badge variant="secondary" className="text-xs px-1">
                            Current
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right text-emerald-600 font-medium min-w-0">
                      €{row.income.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-right text-red-600 font-medium min-w-0">
                      €{row.expenses.toFixed(2)}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-2 text-right font-bold min-w-0",
                        row.balance >= 0 ? "text-emerald-600" : "text-red-600"
                      )}
                    >
                      €{row.balance.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/50 font-bold">
                  <td className="px-2 py-2">Total</td>
                  <td className="px-2 py-2 text-right text-emerald-700">
                    €{annualIncome.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-right text-red-700">
                    €{annualExpenses.toFixed(2)}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-2 text-right",
                      finalBalance >= 0 ? "text-emerald-600" : "text-red-600"
                    )}
                  >
                    €{finalBalance.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

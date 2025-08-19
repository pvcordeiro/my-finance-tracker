"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FinanceData } from "@/hooks/use-finance-data";

interface SimpleChartProps {
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

function getRollingMonths(): Array<{ label: string; month: number }> {
  const now = new Date();
  const currentMonth = now.getMonth();
  const months = [];

  for (let i = 0; i < 12; i++) {
    const monthIndex = (currentMonth + i) % 12;
    months.push({
      label: MONTHS[monthIndex],
      month: monthIndex,
    });
  }

  return months;
}

export function SimpleChart({ data }: SimpleChartProps) {
  if (!data || (!data.incomes && !data.expenses)) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No data available
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Monthly Net Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No data available
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const months = getRollingMonths();

  const chartData = months.map((month) => {
    let income = 0;
    let expenses = 0;

    if (data.incomes) {
      data.incomes.forEach((incomeEntry) => {
        income += incomeEntry.amounts[month.month] || 0;
      });
    }

    if (data.expenses) {
      data.expenses.forEach((expenseEntry) => {
        expenses += expenseEntry.amounts[month.month] || 0;
      });
    }

    return {
      month: month.label,
      income,
      expenses,
      net: income - expenses,
    };
  });

  const maxValue = Math.max(
    ...chartData.map((d) => Math.max(d.income, d.expenses))
  );
  const minNet = Math.min(...chartData.map((d) => d.net));
  const maxNet = Math.max(...chartData.map((d) => d.net));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Income vs Expenses Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {chartData.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>{item.month}</span>
                  <span>€{(item.income - item.expenses).toFixed(0)}</span>
                </div>
                <div className="flex gap-1 h-8">
                  {/* Income bar */}
                  <div
                    className="bg-emerald-500 rounded-l flex items-center justify-center text-xs text-white font-medium"
                    style={{
                      width: `${
                        maxValue > 0 ? (item.income / maxValue) * 100 : 0
                      }%`,
                    }}
                    title={`Income: €${item.income.toFixed(2)}`}
                  >
                    {item.income > 0 && `€${item.income.toFixed(0)}`}
                  </div>
                  {/* Expenses bar */}
                  <div
                    className="bg-red-500 rounded-r flex items-center justify-center text-xs text-white font-medium"
                    style={{
                      width: `${
                        maxValue > 0 ? (item.expenses / maxValue) * 100 : 0
                      }%`,
                    }}
                    title={`Expenses: €${item.expenses.toFixed(2)}`}
                  >
                    {item.expenses > 0 && `€${item.expenses.toFixed(0)}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Net Balance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Net Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {chartData.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>{item.month}</span>
                  <span
                    className={
                      item.net >= 0 ? "text-emerald-600" : "text-red-600"
                    }
                  >
                    €{item.net.toFixed(0)}
                  </span>
                </div>
                <div className="relative h-6 bg-gray-100 rounded">
                  {/* Zero line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-gray-400"
                    style={{
                      left: `${
                        maxNet > minNet
                          ? ((0 - minNet) / (maxNet - minNet)) * 100
                          : 50
                      }%`,
                    }}
                  />
                  {/* Net balance bar */}
                  <div
                    className={`absolute top-1 bottom-1 rounded ${
                      item.net >= 0 ? "bg-emerald-500" : "bg-red-500"
                    }`}
                    style={{
                      left:
                        item.net >= 0
                          ? `${
                              maxNet > minNet
                                ? ((0 - minNet) / (maxNet - minNet)) * 100
                                : 50
                            }%`
                          : `${
                              maxNet > minNet
                                ? ((item.net - minNet) / (maxNet - minNet)) *
                                  100
                                : 45
                            }%`,
                      width: `${
                        maxNet > minNet
                          ? (Math.abs(item.net) / (maxNet - minNet)) * 100
                          : 10
                      }%`,
                    }}
                    title={`Net: €${item.net.toFixed(2)}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

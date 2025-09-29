"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import type { FinanceData } from "@/hooks/use-finance-data";

interface FinancialChartProps {
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
  const months = [] as Array<{ label: string; month: number }>;
  for (let i = 0; i < 12; i++) {
    const monthIndex = (currentMonth + i) % 12;
    months.push({ label: MONTHS[monthIndex], month: monthIndex });
  }
  return months;
}

export function FinancialChart({ data }: FinancialChartProps) {
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
  let runningBalance = 0;
  const chartData = months.map((month, idx) => {
    let income = 0;
    let expenses = 0;

    if (data.incomes) {
      data.incomes.forEach((incomeEntry) => {
        income += incomeEntry.amounts[idx] || 0;
      });
    }

    if (data.expenses) {
      data.expenses.forEach((expenseEntry) => {
        expenses += expenseEntry.amounts[idx] || 0;
      });
    }

    let net = income - expenses;
    if (idx === 0) {
      net += data.bankAmount || 0;
    }
    runningBalance += net;

    return {
      month: month.label,
      income,
      expenses,
      net: runningBalance,
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Income vs Expenses Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div
              className="min-w-[400px] w-full"
              role="img"
              aria-label="Bar chart showing income versus expenses for each month"
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `€${value.toFixed(2)}`,
                      name === "income" ? "Income" : "Expenses",
                    ]}
                    labelFormatter={(label) => `Month: ${label}`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="income"
                    fill="#22c55e"
                    name="income"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="expenses"
                    fill="#ef4444"
                    name="expenses"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Net Balance Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Net Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div
              className="min-w-[400px] w-full"
              role="img"
              aria-label="Line chart showing monthly net balance over time"
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    formatter={(value: number) => [
                      `€${value.toFixed(2)}`,
                      "Net Balance",
                    ]}
                    labelFormatter={(label) => `Month: ${label}`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{
                      fill: "hsl(var(--primary))",
                      strokeWidth: 2,
                      r: 4,
                    }}
                    activeDot={{
                      r: 6,
                      stroke: "hsl(var(--primary))",
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

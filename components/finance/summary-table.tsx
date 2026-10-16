"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { FinanceData } from "@/hooks/use-finance-data";
import { PrivacyNumber } from "@/components/ui/privacy-number";
import { useLanguage } from "@/hooks/use-language";
import { BalanceAlert } from "@/components/finance/balance-alert";
import { buildMonthlyForecast } from "@/lib/finance-forecast";

interface MonthlySummaryRow {
  month: string;
  calendarMonth: number;
  monthIndex: number;
  year: number;
  income: number;
  expenses: number;
  net: number;
  balance: number | null;
  isCurrentMonth: boolean;
  isForecast: boolean;
}

interface SummaryTableProps {
  data: FinanceData;
  tourPreview?: boolean;
}

export function SummaryTable({ data, tourPreview = false }: SummaryTableProps) {
  const { t, formatCurrency, currencySymbol } = useLanguage();

  function compactNumber(value: number): string {
    const abs = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    const sym = currencySymbol;
    if (abs >= 1_000_000) {
      const m = Math.round(abs / 100_000) / 10;
      return `${sign}${sym}${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
    }
    if (abs >= 1_000) {
      const k = Math.round(abs / 100) / 10;
      return `${sign}${sym}${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
    }
    return formatCurrency(value);
  }

  const MONTHS = [
    t("months.jan"),
    t("months.feb"),
    t("months.mar"),
    t("months.apr"),
    t("months.may"),
    t("months.jun"),
    t("months.jul"),
    t("months.aug"),
    t("months.sep"),
    t("months.oct"),
    t("months.nov"),
    t("months.dec"),
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

  if (!data || (!data.incomes && !data.expenses)) {
    return (
      <Card>
        <CardHeader>
            <CardTitle>{t("common.financialSummary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {t("common.noDataAvailable")}
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
  const monthlyData: MonthlySummaryRow[] = buildMonthlyForecast(months.map((month, index) => {
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

    annualIncome += totalIncome;
    annualExpenses += totalExpenses;

    return {
      year: month.year,
      income: totalIncome,
      expenses: totalExpenses,
      month: month.label,
      calendarMonth: month.month,
      monthIndex: index,
      isCurrentMonth: month.year === currentYear && month.month === currentMonth,
    };
  }), data.bankAmount || 0, currentYear, currentMonth);

  const finalBalance = monthlyData[monthlyData.length - 1]?.balance ?? data.bankAmount ?? 0;
  const currentBalance =
    monthlyData.find((m) => m.isCurrentMonth)?.balance ?? data.bankAmount ?? 0;
  const nextMonthBalance = monthlyData[1]?.balance ?? data.bankAmount ?? 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div data-tour="tour-alert">
        <BalanceAlert
          tourPreview={tourPreview}
          projectedMonths={monthlyData.filter((row) => row.isForecast).map(({ month, year, balance }) => ({
            label: month,
            year,
            balance: balance ?? 0,
          }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4 xl:grid-cols-5">
        <div className="col-span-2 bg-card px-4 py-4 sm:col-span-1 sm:px-4 sm:py-4">
          <p className="mb-1 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:text-left">
            {t("dashboard.actualBalance")}
          </p>
          <p className={cn("truncate text-center text-xl font-bold tabular-nums sm:text-left sm:text-2xl", (data.bankAmount || 0) >= 0 ? "text-foreground" : "text-finance-negative")}>
            <PrivacyNumber value={data.bankAmount || 0} />
          </p>
        </div>
        <div className="bg-card px-3 py-3 sm:px-4 sm:py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {t("dashboard.currentMonth")}
          </p>
          <p
            className={cn(
              "text-xl sm:text-2xl font-bold truncate",
              currentBalance >= 0
                ? "text-finance-positive"
                : "text-finance-negative"
            )}
          >
            <PrivacyNumber value={currentBalance} />
          </p>
        </div>

        <div className="bg-card px-3 py-3 sm:px-4 sm:py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {t("dashboard.nextMonth")}
          </p>
          <p
            className={cn(
              "text-xl sm:text-2xl font-bold truncate",
              nextMonthBalance >= 0
                ? "text-finance-positive"
                : "text-finance-negative"
            )}
          >
            <PrivacyNumber value={nextMonthBalance} />
          </p>
        </div>

        <div className="bg-card px-3 py-3 sm:px-4 sm:py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-finance-positive/70 mb-1">
            {t("dashboard.yearIncome")}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-finance-positive truncate">
            <PrivacyNumber value={annualIncome} />
          </p>
        </div>

        <div className="bg-card px-3 py-3 sm:px-4 sm:py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-finance-negative/70 mb-1">
            {t("dashboard.yearExpense")}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-finance-negative truncate">
            <PrivacyNumber value={annualExpenses} />
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              {t("dashboard.monthlyFinancialSummary")}
            </CardTitle>
            <CardDescription className="mt-1">{t("dashboard.forecastBasedOnPlan")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs sm:text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="sticky left-0 z-20 border-r border-border bg-muted text-left px-3 py-2 font-semibold shadow-[1px_0_0_hsl(var(--border))]">
                    {t("dashboard.month")}
                  </th>
                  <th className="text-right px-3 py-2 font-semibold text-finance-positive">
                    {t("dashboard.income")}
                  </th>
                  <th className="text-right px-3 py-2 font-semibold text-finance-negative">
                    {t("dashboard.expenses")}
                  </th>
                  <th className="text-right pl-3 pr-4 py-2 font-semibold">
                    {t("dashboard.net")}
                  </th>
                  <th className="text-right pl-3 pr-4 py-2 font-semibold">
                    {t("dashboard.projectedBalance")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((row) => (
                  <tr
                    key={`${row.year}-${row.calendarMonth}`}
                    className={cn(
                      "border-b hover:bg-muted/30 transition-colors",
                      row.isCurrentMonth && "bg-primary/5 border-primary/20"
                    )}
                  >
                    <td className={cn("sticky left-0 z-10 border-r border-border bg-card px-3 py-2 font-medium shadow-[1px_0_0_hsl(var(--border))]", row.isCurrentMonth ? "bg-[hsl(var(--background))] text-primary-contrast" : "bg-card")}>
                      {row.month} {row.year}
                    </td>
                    <td className="px-3 py-2 text-right text-finance-positive font-medium">
                      <PrivacyNumber value={row.income} format={compactNumber} />
                    </td>
                    <td className="px-3 py-2 text-right text-finance-negative font-medium">
                      <PrivacyNumber value={row.expenses} format={compactNumber} />
                    </td>
                    <td className={cn("px-3 py-2 text-right font-medium", row.net >= 0 ? "text-finance-positive" : "text-finance-negative")}>
                      <PrivacyNumber value={row.net} format={compactNumber} />
                    </td>
                    <td
                      className={cn(
                        "pl-3 pr-4 py-2 text-right font-bold",
                        (row.balance ?? 0) >= 0
                          ? "text-finance-positive"
                          : "text-finance-negative"
                      )}
                    >
                      {row.isForecast ? <PrivacyNumber value={row.balance ?? 0} format={compactNumber} /> : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/50 font-bold">
                  <td className="sticky left-0 z-10 border-r border-border bg-muted px-3 py-2 shadow-[1px_0_0_hsl(var(--border))]">{t("common.total")}</td>
                  <td className="px-3 py-2 text-right text-finance-positive">
                    <PrivacyNumber value={annualIncome} format={compactNumber} />
                  </td>
                  <td className="px-3 py-2 text-right text-finance-negative">
                    <PrivacyNumber value={annualExpenses} format={compactNumber} />
                  </td>
                  <td className={cn("px-3 py-2 text-right", annualIncome >= annualExpenses ? "text-finance-positive" : "text-finance-negative")}>
                    <PrivacyNumber value={annualIncome - annualExpenses} format={compactNumber} />
                  </td>
                  <td
                    className={cn(
                      "pl-3 pr-4 py-2 text-right",
                      finalBalance >= 0
                        ? "text-finance-positive"
                        : "text-finance-negative"
                    )}
                  >
                    <PrivacyNumber value={finalBalance} format={compactNumber} />
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

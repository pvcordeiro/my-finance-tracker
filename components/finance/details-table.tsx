"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Maximize2, Minimize2 } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { FinanceData } from "@/hooks/use-finance-data";
import { PrivacyNumber } from "@/components/ui/privacy-number";
import { PrivacyText } from "@/components/ui/privacy-text";
import { useLanguage } from "@/hooks/use-language";

interface DetailsTableProps {
  data: FinanceData;
}

export function DetailsTable({ data }: DetailsTableProps) {
  const { t } = useLanguage();

  const getMonthLabel = (monthIndex: number): string => {
    const monthKeys = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ];
    return t(`months.${monthKeys[monthIndex]}`);
  };

  const getRollingMonths = (): Array<{
    label: string;
    year: number;
    month: number;
  }> => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const months = [];

    for (let i = 0; i < 12; i++) {
      const monthIndex = (currentMonth + i) % 12;
      const year = currentYear + Math.floor((currentMonth + i) / 12);
      months.push({
        label: getMonthLabel(monthIndex),
        year,
        month: monthIndex,
      });
    }

    return months;
  };

  const months = getRollingMonths();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const [fullscreenState, setFullscreen] = useState<
    null | "income" | "expense"
  >(null);
  const incomeWrapperRef = useRef<HTMLDivElement | null>(null);
  const expenseWrapperRef = useRef<HTMLDivElement | null>(null);

  const exitFullscreen = useCallback(async () => {
    setFullscreen(null);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {}
    }
  }, []);

  const requestOrientationLock = async () => {
    try {
      const anyScreen = screen as Screen & {
        orientation?: ScreenOrientation & {
          lock?: (orientation: string) => Promise<void>;
        };
      };
      if (
        anyScreen.orientation &&
        typeof anyScreen.orientation.lock === "function"
      ) {
        await anyScreen.orientation.lock("landscape");
      }
    } catch {}
  };

  const enterFullscreen = useCallback(
    async (which: "income" | "expense") => {
      if (fullscreenState === which) {
        await exitFullscreen();
        return;
      }
      const target =
        which === "income"
          ? incomeWrapperRef.current
          : expenseWrapperRef.current;
      setFullscreen(which);
      if (target && target.requestFullscreen) {
        try {
          await target.requestFullscreen();
          await requestOrientationLock();
        } catch {}
      }
    },
    [exitFullscreen, fullscreenState]
  );

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        setFullscreen(null);
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    if (fullscreenState) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [fullscreenState]);

  return (
    <div className="space-y-8">
      {/* Income Details */}
      <Card
        className={cn(
          "income-card shadow-sm relative",
          fullscreenState === "income" && "z-50"
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-finance-positive">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-finance-positive/10 ring-1 ring-finance-positive/30">
              <TrendingUp className="w-4 h-4" />
            </span>
            <span className="tracking-tight">{t("entries.incomeDetails")}</span>
          </CardTitle>
          <div className="md:hidden ml-auto -mt-1">
            <button
              type="button"
              aria-label={
                fullscreenState === "income"
                  ? t("entries.exitFullscreen")
                  : t("entries.enterFullscreen")
              }
              onClick={() => enterFullscreen("income")}
              className="inline-flex items-center justify-center rounded-md border border-border bg-card backdrop-blur px-2 py-1 text-foreground shadow-sm hover:bg-accent active:scale-[0.97] transition text-xs font-medium"
            >
              {fullscreenState === "income" ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={incomeWrapperRef}
            className={cn(
              "overflow-x-auto rounded-lg border border-border shadow-sm transition-[width_height] bg-card",
              fullscreenState === "income" &&
                "fixed inset-0 z-50 !m-0 w-screen h-screen rounded-none border-0 flex flex-col p-0 bg-background"
            )}
            data-fullscreen={fullscreenState === "income" || undefined}
          >
            {fullscreenState === "income" && (
              <div className="flex items-center justify-between mb-2 md:hidden px-3 pt-3">
                <h2 className="text-sm font-semibold text-finance-positive">
                  {t("entries.incomeDetailsFullscreen")}
                </h2>
                <button
                  type="button"
                  aria-label={t("entries.exitFullscreen")}
                  onClick={exitFullscreen}
                  className="inline-flex items-center justify-center rounded-md border border-border bg-card backdrop-blur px-2 py-1 text-foreground shadow-sm hover:bg-accent active:scale-[0.97] transition text-xs font-medium"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <table className="w-full border-collapse min-w-[700px] text-xs sm:text-sm leading-tight">
              <thead
                className={cn(
                  "text-[11px] uppercase tracking-wide",
                  fullscreenState === "income" && "sticky top-0 z-30 shadow-sm"
                )}
              >
                <tr
                  className={cn(
                    "bg-muted border-b border-border",
                    fullscreenState === "income" &&
                      "backdrop-blur supports-[backdrop-filter]:bg-muted/90"
                  )}
                >
                  <th
                    className={cn(
                      "sticky left-0 bg-muted backdrop-blur text-left px-2 py-2 font-semibold border-r border-border min-w-[120px] z-20",
                      fullscreenState === "income" && "pl-3 min-w-[110px]",
                      "text-soft-shadow-strong"
                    )}
                  >
                    {t("entries.description")}
                  </th>
                  {months.map((month) => {
                    const isCurrent =
                      month.year === currentYear &&
                      month.month === currentMonth;
                    return (
                      <th
                        key={month.label}
                        className={cn(
                          "text-center px-2 py-2 font-semibold min-w-[70px] relative text-soft-shadow",
                          isCurrent && "text-primary"
                        )}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{month.label}</span>
                          {isCurrent && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 h-4 leading-4"
                            >
                              {t("entries.now")}
                            </Badge>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="[&_tr:nth-child(even)]:bg-muted/50">
                {data.bankAmount > 0 && (
                  <tr className="border-b border-border hover:bg-muted/70 transition-colors group">
                    <td className="sticky left-0 bg-muted/60 backdrop-blur px-2 py-2 font-medium border-r border-border z-10 text-soft-shadow-strong">
                      <span className="text-foreground">
                        {t("dashboard.currentBalance")}
                      </span>
                    </td>
                    {months.map((month) => {
                      const isCurrent =
                        month.year === currentYear &&
                        month.month === currentMonth;
                      return (
                        <td
                          key={month.label}
                          className={cn(
                            "text-center px-2 py-2 tabular-nums",
                            isCurrent && "bg-primary/5 font-semibold"
                          )}
                        >
                          {isCurrent ? (
                            <span className="text-finance-positive text-soft-shadow">
                              <PrivacyNumber value={data.bankAmount} />
                            </span>
                          ) : (
                            <span className="text-muted-foreground/70 text-soft-shadow">
                              –
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )}
                {data.incomes.map((income) => (
                  <tr
                    key={income.id}
                    className="border-b border-border hover:bg-muted/70 transition-colors group"
                  >
                    <td className="sticky left-0 bg-muted/60 backdrop-blur px-2 py-2 font-medium border-r border-border z-10 text-soft-shadow-strong">
                      <span className="text-foreground">
                        <PrivacyText
                          value={
                            income.description || t("entries.noDescription")
                          }
                        />
                      </span>
                    </td>
                    {months.map((month, idx) => {
                      const amount = income.amounts[idx] || 0;
                      const isCurrent =
                        month.year === currentYear &&
                        month.month === currentMonth;
                      return (
                        <td
                          key={month.label}
                          className={cn(
                            "text-center px-2 py-2 tabular-nums",
                            isCurrent && "bg-primary/5 font-semibold"
                          )}
                        >
                          {amount > 0 ? (
                            <span className="text-finance-positive text-soft-shadow">
                              <PrivacyNumber value={amount} />
                            </span>
                          ) : (
                            <span className="text-muted-foreground/70 text-soft-shadow">
                              –
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {data.incomes.length === 0 && (
                  <tr>
                    <td
                      colSpan={13}
                      className="text-center px-6 py-8 text-muted-foreground text-sm"
                    >
                      {t("entries.noIncomeEntriesFound")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Expense Details */}
      <Card
        className={cn(
          "expense-card shadow-sm relative",
          fullscreenState === "expense" && "z-50"
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-finance-negative">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-finance-negative/10 ring-1 ring-finance-negative/30">
              <TrendingDown className="w-4 h-4" />
            </span>
            <span className="tracking-tight">
              {t("entries.expenseDetails")}
            </span>
          </CardTitle>
          <div className="md:hidden ml-auto -mt-1">
            <button
              type="button"
              aria-label={
                fullscreenState === "expense"
                  ? t("entries.exitFullscreen")
                  : t("entries.enterFullscreen")
              }
              onClick={() => enterFullscreen("expense")}
              className="inline-flex items-center justify-center rounded-md border border-border bg-card backdrop-blur px-2 py-1 text-foreground shadow-sm hover:bg-accent active:scale-[0.97] transition text-xs font-medium"
            >
              {fullscreenState === "expense" ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={expenseWrapperRef}
            className={cn(
              "overflow-x-auto rounded-lg border border-border shadow-sm transition-[width_height] bg-card",
              fullscreenState === "expense" &&
                "fixed inset-0 z-50 !m-0 w-screen h-screen rounded-none border-0 flex flex-col p-0 bg-background"
            )}
            data-fullscreen={fullscreenState === "expense" || undefined}
          >
            {fullscreenState === "expense" && (
              <div className="flex items-center justify-between mb-2 md:hidden px-3 pt-3">
                <h2 className="text-sm font-semibold text-finance-negative">
                  {t("entries.expenseDetailsFullscreen")}
                </h2>
                <button
                  type="button"
                  aria-label={t("entries.exitFullscreen")}
                  onClick={exitFullscreen}
                  className="inline-flex items-center justify-center rounded-md border border-border bg-card backdrop-blur px-2 py-1 text-foreground shadow-sm hover:bg-accent active:scale-[0.97] transition text-xs font-medium"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <table className="w-full border-collapse min-w-[700px] text-xs sm:text-sm leading-tight">
              <thead
                className={cn(
                  "text-[11px] uppercase tracking-wide",
                  fullscreenState === "expense" && "sticky top-0 z-30 shadow-sm"
                )}
              >
                <tr
                  className={cn(
                    "bg-muted border-b border-border",
                    fullscreenState === "expense" &&
                      "backdrop-blur supports-[backdrop-filter]:bg-muted/90"
                  )}
                >
                  <th
                    className={cn(
                      "sticky left-0 bg-muted backdrop-blur text-left px-2 py-2 font-semibold border-r border-border min-w-[120px] z-20",
                      fullscreenState === "expense" && "pl-3 min-w-[110px]",
                      "text-soft-shadow-strong"
                    )}
                  >
                    {t("entries.description")}
                  </th>
                  {months.map((month) => {
                    const isCurrent =
                      month.year === currentYear &&
                      month.month === currentMonth;
                    return (
                      <th
                        key={month.label}
                        className={cn(
                          "text-center px-2 py-2 font-semibold min-w-[70px] relative text-soft-shadow",
                          isCurrent && "text-primary"
                        )}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{month.label}</span>
                          {isCurrent && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 h-4 leading-4"
                            >
                              {t("entries.now")}
                            </Badge>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="[&_tr:nth-child(even)]:bg-muted/30">
                {data.expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors group"
                  >
                    <td className="sticky left-0 bg-muted/60 backdrop-blur px-2 py-2 font-medium border-r border-border z-10 text-soft-shadow-strong">
                      <span className="text-foreground">
                        <PrivacyText
                          value={
                            expense.description || t("entries.noDescription")
                          }
                        />
                      </span>
                    </td>
                    {months.map((month, idx) => {
                      const amount = expense.amounts[idx] || 0;
                      const isCurrent =
                        month.year === currentYear &&
                        month.month === currentMonth;
                      return (
                        <td
                          key={month.label}
                          className={cn(
                            "text-center px-2 py-2 tabular-nums",
                            isCurrent && "bg-primary/5 font-semibold"
                          )}
                        >
                          {amount > 0 ? (
                            <span className="text-finance-negative text-soft-shadow">
                              <PrivacyNumber value={amount} />
                            </span>
                          ) : (
                            <span className="text-muted-foreground/70 text-soft-shadow">
                              –
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {data.expenses.length === 0 && (
                  <tr>
                    <td
                      colSpan={13}
                      className="text-center px-6 py-8 text-muted-foreground text-sm"
                    >
                      {t("entries.noExpenseEntriesFound")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

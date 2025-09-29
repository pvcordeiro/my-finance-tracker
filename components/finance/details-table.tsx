"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Maximize2, Minimize2 } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { FinanceData } from "@/hooks/use-finance-data";

interface DetailsTableProps {
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

export function DetailsTable({ data }: DetailsTableProps) {
  const months = getRollingMonths();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const [fullscreen, setFullscreen] = useState<null | "income" | "expense">(
    null
  );
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
      if (fullscreen === which) {
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
    [exitFullscreen, fullscreen]
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
    if (fullscreen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [fullscreen]);

  return (
    <div className="space-y-8">
      {/* Income Details */}
      <Card
        className={cn(
          "income-card shadow-sm relative",
          fullscreen === "income" && "z-50"
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600/10 ring-1 ring-emerald-600/30 dark:bg-emerald-500/10 dark:ring-emerald-400/40">
              <TrendingUp className="w-4 h-4" />
            </span>
            <span className="tracking-tight">Income Details</span>
          </CardTitle>
          <div className="md:hidden ml-auto -mt-1">
            <button
              type="button"
              aria-label={
                fullscreen === "income" ? "Exit fullscreen" : "Enter fullscreen"
              }
              onClick={() => enterFullscreen("income")}
              className="inline-flex items-center justify-center rounded-md border border-emerald-300/60 dark:border-emerald-600/40 bg-white/60 dark:bg-emerald-900/40 backdrop-blur px-2 py-1 text-emerald-700 dark:text-emerald-200 shadow-sm hover:bg-emerald-50 dark:hover:bg-emerald-800/60 active:scale-[0.97] transition text-xs font-medium"
            >
              {fullscreen === "income" ? (
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
              "overflow-x-auto rounded-lg border border-emerald-200/60 dark:border-emerald-500/20 shadow-sm transition-[width_height] bg-emerald-50/60 dark:bg-emerald-950/20",
              fullscreen === "income" &&
                "fixed inset-0 z-50 !m-0 w-screen h-screen rounded-none border-0 flex flex-col p-0 bg-emerald-50/60 dark:bg-emerald-950/20"
            )}
            data-fullscreen={fullscreen === "income" || undefined}
          >
            {fullscreen === "income" && (
              <div className="flex items-center justify-between mb-2 md:hidden px-3 pt-3">
                <h2 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Income Details (Fullscreen)
                </h2>
                <button
                  type="button"
                  aria-label="Exit fullscreen"
                  onClick={exitFullscreen}
                  className="inline-flex items-center justify-center rounded-md border border-emerald-300/60 dark:border-emerald-600/40 bg-white/60 dark:bg-emerald-900/40 backdrop-blur px-2 py-1 text-emerald-700 dark:text-emerald-200 shadow-sm hover:bg-emerald-50 dark:hover:bg-emerald-800/60 active:scale-[0.97] transition text-xs font-medium"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <table className="w-full border-collapse min-w-[700px] text-xs sm:text-sm leading-tight text-neutral-800 dark:text-neutral-200">
              <thead
                className={cn(
                  "text-[11px] uppercase tracking-wide text-emerald-900 dark:text-emerald-200",
                  fullscreen === "income" && "sticky top-0 z-30 shadow-sm"
                )}
              >
                <tr
                  className={cn(
                    "bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 border-b border-emerald-200/70 dark:border-emerald-700/40",
                    fullscreen === "income" &&
                      "backdrop-blur supports-[backdrop-filter]:bg-emerald-100/80 dark:supports-[backdrop-filter]:bg-emerald-900/70"
                  )}
                >
                  <th
                    className={cn(
                      "sticky left-0 bg-emerald-100/90 dark:bg-emerald-900/60 backdrop-blur text-left px-2 py-2 font-semibold border-r border-emerald-200/60 dark:border-emerald-700/40 min-w-[120px] z-20 text-emerald-900 dark:text-emerald-200",
                      fullscreen === "income" && "pl-3 min-w-[110px]",
                      "text-soft-shadow-strong"
                    )}
                  >
                    Description
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
                          isCurrent && "text-emerald-900 dark:text-emerald-100"
                        )}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{month.label}</span>
                          {isCurrent && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 h-4 leading-4"
                            >
                              Now
                            </Badge>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="[&_tr:nth-child(even)]:bg-emerald-50 dark:[&_tr:nth-child(even)]:bg-emerald-900/20">
                {data.bankAmount > 0 && (
                  <tr className="border-b border-emerald-200/60 dark:border-emerald-800/50 hover:bg-emerald-100/70 dark:hover:bg-emerald-800/40 transition-colors group">
                    <td className="sticky left-0 bg-muted/80 backdrop-blur px-3 py-2 font-medium border-r border-emerald-200/60 dark:border-emerald-700/50 z-10">
                      <span className="inline-flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                        Bank Balance
                      </span>
                    </td>
                    {months.map((month) => (
                      <td
                        key={month.label}
                        className="text-center px-2 py-2 tabular-nums font-medium"
                      >
                        {month.year === currentYear &&
                        month.month === currentMonth ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                            €{data.bankAmount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/70">–</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )}
                {data.incomes.map((income) => (
                  <tr
                    key={income.id}
                    className="border-b border-emerald-200/60 dark:border-emerald-800/50 hover:bg-emerald-100/70 dark:hover:bg-emerald-800/40 transition-colors group"
                  >
                    <td className="sticky left-0 bg-muted/60 backdrop-blur px-2 py-2 font-medium border-r border-emerald-200/60 dark:border-emerald-700/50 z-10 text-soft-shadow-strong">
                      <span className="text-emerald-950 dark:text-emerald-100">
                        {income.description || "(No description)"}
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
                            isCurrent &&
                              "bg-emerald-600/5 dark:bg-emerald-500/10 font-semibold"
                          )}
                        >
                          {amount > 0 ? (
                            <span className="text-emerald-700 dark:text-emerald-400 text-soft-shadow">
                              €{amount.toFixed(2)}
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
      <Card
        className={cn(
          "expense-card shadow-sm relative",
          fullscreen === "expense" && "z-50"
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-600/10 ring-1 ring-red-600/30 dark:bg-red-500/10 dark:ring-red-400/40">
              <TrendingDown className="w-4 h-4" />
            </span>
            <span className="tracking-tight">Expense Details</span>
          </CardTitle>
          <div className="md:hidden ml-auto -mt-1">
            <button
              type="button"
              aria-label={
                fullscreen === "expense"
                  ? "Exit fullscreen"
                  : "Enter fullscreen"
              }
              onClick={() => enterFullscreen("expense")}
              className="inline-flex items-center justify-center rounded-md border border-red-300/60 dark:border-red-600/40 bg-white/60 dark:bg-red-900/40 backdrop-blur px-2 py-1 text-red-700 dark:text-red-200 shadow-sm hover:bg-red-50 dark:hover:bg-red-800/60 active:scale-[0.97] transition text-xs font-medium"
            >
              {fullscreen === "expense" ? (
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
              "overflow-x-auto rounded-lg border border-red-200/60 dark:border-red-500/20 shadow-sm transition-[width_height] bg-red-50/60 dark:bg-red-950/20",
              fullscreen === "expense" &&
                "fixed inset-0 z-50 !m-0 w-screen h-screen rounded-none border-0 flex flex-col p-0 bg-red-50/60 dark:bg-red-950/20"
            )}
            data-fullscreen={fullscreen === "expense" || undefined}
          >
            {fullscreen === "expense" && (
              <div className="flex items-center justify-between mb-2 md:hidden px-3 pt-3">
                <h2 className="text-sm font-semibold text-red-700 dark:text-red-300">
                  Expense Details (Fullscreen)
                </h2>
                <button
                  type="button"
                  aria-label="Exit fullscreen"
                  onClick={exitFullscreen}
                  className="inline-flex items-center justify-center rounded-md border border-red-300/60 dark:border-red-600/40 bg-white/60 dark:bg-red-900/40 backdrop-blur px-2 py-1 text-red-700 dark:text-red-200 shadow-sm hover:bg-red-50 dark:hover:bg-red-800/60 active:scale-[0.97] transition text-xs font-medium"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <table className="w-full border-collapse min-w-[700px] text-xs sm:text-sm leading-tight text-neutral-800 dark:text-neutral-200">
              <thead
                className={cn(
                  "text-[11px] uppercase tracking-wide text-red-900 dark:text-red-200",
                  fullscreen === "expense" && "sticky top-0 z-30 shadow-sm"
                )}
              >
                <tr
                  className={cn(
                    "bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 border-b border-red-200/70 dark:border-red-700/40",
                    fullscreen === "expense" &&
                      "backdrop-blur supports-[backdrop-filter]:bg-red-100/80 dark:supports-[backdrop-filter]:bg-red-900/70"
                  )}
                >
                  <th
                    className={cn(
                      "sticky left-0 bg-red-100/90 dark:bg-red-900/60 backdrop-blur text-left px-2 py-2 font-semibold border-r border-red-200/60 dark:border-red-700/40 min-w-[120px] z-20 text-red-900 dark:text-red-200",
                      fullscreen === "expense" && "pl-3 min-w-[110px]",
                      "text-soft-shadow-strong"
                    )}
                  >
                    Description
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
                          isCurrent && "text-red-900 dark:text-red-100"
                        )}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{month.label}</span>
                          {isCurrent && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 h-4 leading-4"
                            >
                              Now
                            </Badge>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="[&_tr:nth-child(even)]:bg-red-50 dark:[&_tr:nth-child(even)]:bg-red-900/20">
                {data.expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b border-red-200/60 dark:border-red-800/50 hover:bg-red-100/70 dark:hover:bg-red-800/40 transition-colors group"
                  >
                    <td className="sticky left-0 bg-muted/60 backdrop-blur px-2 py-2 font-medium border-r border-red-200/60 dark:border-red-700/50 z-10 text-soft-shadow-strong">
                      <span className="text-red-950 dark:text-red-100">
                        {expense.description || "(No description)"}
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
                            isCurrent &&
                              "bg-red-600/5 dark:bg-red-500/10 font-semibold"
                          )}
                        >
                          {amount > 0 ? (
                            <span className="text-red-700 dark:text-red-400 text-soft-shadow">
                              €{amount.toFixed(2)}
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
  );
}

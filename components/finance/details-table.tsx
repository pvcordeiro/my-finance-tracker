"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  useState,
  useRef,
  useCallback,
  useEffect,
  Fragment,
  type KeyboardEvent,
} from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";
import type { FinanceData } from "@/hooks/use-finance-data";
import { PrivacyNumber } from "@/components/ui/privacy-number";
import { PrivacyText } from "@/components/ui/privacy-text";
import { useLanguage } from "@/hooks/use-language";
import { useGuidedTourMode } from "@/hooks/use-guided-tour-mode";
import { guidedTourFinanceData } from "@/lib/guided-tour-data";

interface DetailsTableProps {
  data: FinanceData;
  tourPreview?: boolean;
  readOnly?: boolean;
}

interface RollingMonth {
  label: string;
  fullLabel: string;
  year: number;
  month: number;
}

interface MobileMonthCarouselProps {
  type: "income" | "expense";
  entries: FinanceData["incomes"];
  bankAmount: number;
  months: RollingMonth[];
  currentMonth: number;
  currentYear: number;
  tourPreview: boolean;
}

interface DetailsSpreadsheetProps {
  data: FinanceData;
  months: RollingMonth[];
  currentMonth: number;
  currentYear: number;
}

function FullscreenToggle({
  active,
  disabled,
  enterLabel,
  exitLabel,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  enterLabel: string;
  exitLabel: string;
  onClick: () => void;
}) {
  const label = active ? exitLabel : enterLabel;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card p-0 text-foreground shadow-sm transition hover:bg-accent active:scale-[0.97] disabled:opacity-50"
    >
      {active ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
    </button>
  );
}

function SpreadsheetDescription({ value }: { value: string }) {
  return (
    <span className="block truncate" title={value}>
      <PrivacyText value={value} />
    </span>
  );
}

function DetailsSpreadsheet({ data, months, currentMonth, currentYear }: DetailsSpreadsheetProps) {
  const { t } = useLanguage();
  const entryRows = [
    { key: "income", label: t("entries.incomeDetails"), entries: data.incomes, color: "text-finance-positive" },
    { key: "expense", label: t("entries.expenseDetails"), entries: data.expenses, color: "text-finance-negative" },
  ];

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-card">
      <table className="w-full min-w-[791px] table-fixed border-collapse text-[10px] leading-tight sm:text-xs">
        <colgroup>
          <col className="w-[95px]" />
          {months.map((month) => <col key={`${month.year}-${month.month}`} className="w-[58px]" />)}
        </colgroup>
        <thead className="sticky top-0 z-30 shadow-sm">
          <tr className="border-b border-border bg-muted">
            <th className="sticky left-0 z-40 border-r border-border bg-muted px-1.5 py-1.5 text-left font-semibold uppercase tracking-wide text-muted-foreground">
              {t("entries.description")}
            </th>
            {months.map((month, index) => {
              const isCurrent = month.year === currentYear && month.month === currentMonth;
              const showYear = index === 0 || month.year !== months[index - 1]?.year;
              return <th key={`${month.year}-${month.month}`} className={cn("px-0.5 py-1.5 text-center font-semibold uppercase tracking-wide text-muted-foreground", isCurrent && "bg-primary/10 text-primary-contrast")}>
                {month.label}{showYear ? ` '${String(month.year).slice(-2)}` : ""}
              </th>;
            })}
          </tr>
        </thead>
        <tbody>
          {entryRows.map((section) => <Fragment key={section.key}>
            <tr className="border-y border-border bg-muted/70">
              <th scope="row" className={cn("sticky left-0 top-[27px] z-30 w-[95px] min-w-[95px] overflow-visible border-r border-border bg-muted px-1.5 py-1 text-left text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur", section.color)}>
                <span className="relative block h-3 whitespace-nowrap"><span className="absolute left-0 top-0 z-10 w-[158px] whitespace-nowrap bg-muted/95">{section.label}</span></span>
              </th>
              <th colSpan={12} aria-hidden="true" className="sticky top-[27px] z-20 bg-muted/95 px-2 py-1 shadow-sm backdrop-blur" />
            </tr>
            {section.entries.map((entry) => <tr key={entry.id} className="border-b border-border/80 even:bg-muted/20">
              <th scope="row" className="sticky left-0 z-10 w-[95px] min-w-[95px] max-w-[95px] border-r border-border bg-card px-1.5 py-1 text-left font-medium">
                <SpreadsheetDescription value={entry.description || t("entries.noDescription")} />
              </th>
              {months.map((month, index) => {
                const amount = entry.amounts[index] || 0;
                const current = month.year === currentYear && month.month === currentMonth;
                return <td key={`${month.year}-${month.month}`} className={cn("px-0.5 py-1 text-center tabular-nums", current && "bg-primary/5")}>{amount > 0 ? <span className={section.color}><PrivacyNumber value={amount} /></span> : <span className="text-muted-foreground/70">–</span>}</td>;
              })}
            </tr>)}
            {section.entries.length === 0 && <tr className="border-b border-border">
              <td className="px-2 py-2 text-center text-[10px] text-muted-foreground" colSpan={13}>{section.key === "income" ? t("entries.noIncomeEntriesFound") : t("entries.noExpenseEntriesFound")}</td>
            </tr>}
          </Fragment>)}
        </tbody>
      </table>
    </div>
  );
}

function MobileMonthCarousel({
  type,
  entries,
  bankAmount,
  months,
  currentMonth,
  currentYear,
  tourPreview,
}: MobileMonthCarouselProps) {
  const { t } = useLanguage();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const [activeMonthIndex, setActiveMonthIndex] = useState(0);
  const isIncome = type === "income";
  const colorClass = isIncome ? "text-finance-positive" : "text-finance-negative";
  const emptyState = isIncome
    ? t("entries.noIncomeEntriesFound")
    : t("entries.noExpenseEntriesFound");

  useEffect(() => {
    setActiveMonthIndex(0);
  }, [months[0]?.month, months[0]?.year]);

  useEffect(() => {
    const alignActiveMonth = () => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      viewport.scrollTo({
        left: viewport.clientWidth * activeMonthIndex,
        behavior: "auto",
      });
    };

    window.addEventListener("resize", alignActiveMonth);
    return () => window.removeEventListener("resize", alignActiveMonth);
  }, [activeMonthIndex]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  const goToMonth = useCallback(
    (nextIndex: number) => {
      const index = Math.max(0, Math.min(nextIndex, months.length - 1));
      const viewport = viewportRef.current;
      setActiveMonthIndex(index);
      if (!viewport) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      viewport.scrollTo({
        left: viewport.clientWidth * index,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    },
    [months.length]
  );

  const handleScroll = () => {
    if (scrollFrameRef.current !== null) return;
    scrollFrameRef.current = requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (viewport?.clientWidth) {
        const index = Math.max(
          0,
          Math.min(
            Math.round(viewport.scrollLeft / viewport.clientWidth),
            months.length - 1
          )
        );
        setActiveMonthIndex((current) => (current === index ? current : index));
      }
      scrollFrameRef.current = null;
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToMonth(activeMonthIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goToMonth(activeMonthIndex + 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      goToMonth(0);
    } else if (event.key === "End") {
      event.preventDefault();
      goToMonth(months.length - 1);
    }
  };

  return (
    <div className="space-y-3 md:hidden">
      <div className="min-w-0 text-center">
        <p className="truncate text-sm font-semibold" aria-live="polite">
          {t("details.monthAndYear")
            .replace("{month}", months[activeMonthIndex]?.fullLabel || "")
            .replace("{year}", String(months[activeMonthIndex]?.year || ""))}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("entries.monthOf")
            .replace("{current}", String(activeMonthIndex + 1))
            .replace("{total}", String(months.length))}
        </p>
      </div>

      <div
        ref={viewportRef}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-lg border border-border bg-card shadow-sm"
        role="region"
        aria-label={t("details.monthNavigation")}
        tabIndex={0}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
      >
        {months.map((month, monthIndex) => {
          const isCurrent =
            month.year === currentYear && month.month === currentMonth;
          const monthTotal = entries.reduce(
            (total, entry) => total + (entry.amounts[monthIndex] || 0),
            0
          );

          return (
            <section
              key={`${month.year}-${month.month}`}
              className="w-full shrink-0 snap-start p-3"
            >
              <div className="overflow-hidden rounded-md border border-border/70">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 bg-muted px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>{t("entries.description")}</span>
                  <span>{t("entries.amount")}</span>
                </div>
                {(tourPreview && entries.length === 0 ? [{ id: "tour-mobile-entry", description: isIncome ? t("guidedTour.incomeExampleName") : t("guidedTour.expenseExampleName"), amounts: Array.from({ length: 12 }, () => isIncome ? 2400 : 950) }] : entries).map((entry) => {
                  const amount = entry.amounts[monthIndex] || 0;
                  return (
                    <div
                      key={entry.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-t border-border px-3 py-2.5 text-sm"
                    >
                      <span className="min-w-0 truncate font-medium">
                        <PrivacyText
                          value={entry.description || t("entries.noDescription")}
                        />
                      </span>
                      {amount > 0 ? (
                        <span className={cn("font-semibold tabular-nums", colorClass)}>
                          <PrivacyNumber value={amount} />
                        </span>
                      ) : (
                        <span className="text-muted-foreground/70">-</span>
                      )}
                    </div>
                  );
                })}
                {entries.length === 0 && (
                  <p className="border-t border-border px-3 py-8 text-center text-sm text-muted-foreground">
                    {emptyState}
                  </p>
                )}
                {entries.length > 0 && (
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-t-2 border-border bg-muted/50 px-3 py-2.5 text-sm font-semibold">
                    <span>{t("common.total")}</span>
                    <span className={cn("tabular-nums", colorClass)}>
                      <PrivacyNumber value={monthTotal} />
                    </span>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function DetailsTable({ data, tourPreview = false, readOnly = false }: DetailsTableProps) {
  const { t } = useLanguage();
  const [supportsFullscreen, setSupportsFullscreen] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    const platform = nav.userAgentData?.platform || navigator.platform || "";
    const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (/Mac/i.test(platform) && navigator.maxTouchPoints > 1);
    const supportsFullscreen =
      typeof document.documentElement.requestFullscreen === "function" &&
      typeof Element.prototype.requestFullscreen === "function";
    setSupportsFullscreen(supportsFullscreen && !isAppleMobile);
  }, []);

  const displayData = tourPreview ? guidedTourFinanceData : data;

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

  const getFullMonthLabel = (monthIndex: number): string => {
    const monthKeys = [
      "january",
      "february",
      "march",
      "april",
      "mayFull",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];
    return t(`months.${monthKeys[monthIndex]}`);
  };

  const getRollingMonths = (): RollingMonth[] => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const months = [];

    for (let i = 0; i < 12; i++) {
      const monthIndex = (currentMonth + i) % 12;
      const year = currentYear + Math.floor((currentMonth + i) / 12);
      months.push({
        label: getMonthLabel(monthIndex),
        fullLabel: getFullMonthLabel(monthIndex),
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

  const [isFullscreen, setIsFullscreen] = useState(false);
  const detailsWrapperRef = useRef<HTMLDivElement | null>(null);

  const exitFullscreen = useCallback(async () => {
    setIsFullscreen(false);
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

  const enterFullscreen = useCallback(async () => {
      if (isFullscreen) {
        await exitFullscreen();
        return;
      }
      const target = detailsWrapperRef.current;
      flushSync(() => setIsFullscreen(true));
      if (target && target.requestFullscreen) {
        try {
          await target.requestFullscreen();
          await requestOrientationLock();
        } catch {}
      }
    },
    [exitFullscreen, isFullscreen]
  );

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    if (isFullscreen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const resetOrientation = () => {
        const orientation = screen.orientation as ScreenOrientation & { unlock?: () => void };
        orientation?.unlock?.();
      };
      return () => {
        document.body.style.overflow = original;
        resetOrientation();
      };
    }
  }, [isFullscreen]);

  if (isFullscreen) {
    return (
      <div
        ref={detailsWrapperRef}
        className="fixed inset-0 z-50 flex h-[100dvh] w-screen flex-col gap-2 overflow-hidden bg-background p-2 sm:gap-3 sm:p-3"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border pb-2">
          <h1 className="text-sm font-semibold text-foreground sm:text-base">{t("details.spreadsheetTitle")}</h1>
          <button
            type="button"
            aria-label={t("entries.exitFullscreen")}
            onClick={() => void exitFullscreen()}
            className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground shadow-sm transition hover:bg-accent sm:text-sm"
          >
            <Minimize2 className="h-4 w-4" />
            <span>{t("entries.exitFullscreen")}</span>
          </button>
        </div>
        <DetailsSpreadsheet data={displayData} months={months} currentMonth={currentMonth} currentYear={currentYear} />
      </div>
    );
  }

  return (
    <div
      ref={detailsWrapperRef}
      className={cn(
        "space-y-4",
        isFullscreen && "fixed inset-0 z-50 m-0 h-[100dvh] w-screen space-y-2 overflow-auto bg-background p-2 sm:space-y-3 sm:p-3"
      )}
    >
      {/* Income Details */}
      <Card
        data-tour="tour-details-income"
        className={cn(
          "income-card shadow-sm relative",
          isFullscreen && "shrink-0 rounded-md border-border shadow-none"
        )}
      >
        <CardHeader className={cn("flex flex-row items-center justify-between gap-2", isFullscreen && "py-1.5 sm:py-2")}>
          <CardTitle className="flex min-w-0 flex-1 items-center gap-2 text-finance-positive">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-finance-positive/10 ring-1 ring-finance-positive/30">
              <TrendingUp className="w-4 h-4" />
            </span>
            <span className="min-w-0 truncate tracking-tight">{t("entries.incomeDetails")}</span>
          </CardTitle>
          {supportsFullscreen && <div className="shrink-0 md:hidden"><FullscreenToggle
            active={isFullscreen}
            disabled={readOnly}
            enterLabel={t("details.viewAllMonths")}
            exitLabel={t("entries.exitFullscreen")}
            onClick={() => { if (!readOnly) void (isFullscreen ? exitFullscreen() : enterFullscreen()); }}
          /></div>}
        </CardHeader>
        <CardContent className={cn(isFullscreen && "p-0 sm:p-0")}>
          {!isFullscreen && <MobileMonthCarousel
            type="income"
            entries={displayData.incomes}
            bankAmount={displayData.bankAmount}
            months={months}
            currentMonth={currentMonth}
            currentYear={currentYear}
            tourPreview={tourPreview}
          />}
           <div className="relative">
            <div
             className={cn(
              "overflow-x-auto rounded-lg border border-border shadow-sm bg-card",
              isFullscreen ? "block overflow-x-auto rounded-none border-0 shadow-none" : "hidden md:block"
              )}
            >
            <table className={cn("w-full table-fixed border-collapse min-w-[1040px] text-xs sm:text-sm leading-tight", isFullscreen && "min-w-[720px] text-[10px] sm:text-xs")}>
              <thead
                className={cn(
                  "text-[11px] uppercase tracking-wide",
                  isFullscreen && "sticky top-0 z-30 shadow-sm"
                )}
              >
                <tr
                  className={cn(
                    "bg-muted border-b border-border",
                    isFullscreen &&
                      "backdrop-blur supports-[backdrop-filter]:bg-muted/90"
                  )}
                >
                  <th
                    className={cn(
                      "sticky left-0 z-20 w-[200px] min-w-[200px] max-w-[200px] border-r border-border bg-muted text-left px-2 py-2 font-semibold",
                      isFullscreen && "min-w-[95px] px-1.5 py-1",
                      "text-soft-shadow-strong"
                    )}
                  >
                    {t("entries.description")}
                  </th>
                  {months.map((month, monthIndex) => {
                    const isCurrent =
                      month.year === currentYear &&
                      month.month === currentMonth;
                    const previousMonth = months[monthIndex - 1];
                    const showYear = monthIndex === 0 || month.year !== previousMonth?.year;
                    return (
                      <th
                        key={month.label}
                        className={cn(
                          "text-center px-2 py-2 font-semibold min-w-[70px] relative text-soft-shadow",
                           isFullscreen && "min-w-[52px] px-1 py-1",
                           isCurrent && "text-primary-contrast bg-primary/5"
                        )}
                      >
                         {month.label}{showYear ? ` '${String(month.year).slice(-2)}` : ""}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="[&_tr:nth-child(even)]:bg-muted/50">
                {data.incomes.map((income) => (
                  <tr
                    key={income.id}
                    className="border-b border-border hover:bg-muted/70 transition-colors group"
                  >
                    <td className={cn("sticky left-0 z-10 w-[200px] min-w-[200px] max-w-[200px] border-r border-border bg-muted px-2 py-2 font-medium text-soft-shadow-strong", isFullscreen && "px-1.5 py-1 text-[10px] sm:text-xs")}>
                      <span className="block truncate text-foreground" title={income.description || t("entries.noDescription")}>
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
                            isFullscreen && "px-1 py-1 text-[10px] sm:text-xs",
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
          </div>
        </CardContent>
      </Card>

      {/* Expense Details */}
      <Card
        data-tour="tour-details-expenses"
        className={cn(
          "expense-card shadow-sm relative",
          isFullscreen && "shrink-0 rounded-md border-border shadow-none"
        )}
      >
        <CardHeader className={cn("flex flex-row items-center justify-between gap-2", isFullscreen && "py-1.5 sm:py-2")}>
          <CardTitle className="flex min-w-0 flex-1 items-center gap-2 text-finance-negative">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-finance-negative/10 ring-1 ring-finance-negative/30">
              <TrendingDown className="w-4 h-4" />
            </span>
            <span className="min-w-0 truncate tracking-tight">
              {t("entries.expenseDetails")}
            </span>
          </CardTitle>
          {supportsFullscreen && <div className="shrink-0 md:hidden"><FullscreenToggle
            active={isFullscreen}
            disabled={readOnly}
            enterLabel={t("details.viewAllMonths")}
            exitLabel={t("entries.exitFullscreen")}
            onClick={() => { if (!readOnly) void (isFullscreen ? exitFullscreen() : enterFullscreen()); }}
          /></div>}
        </CardHeader>
        <CardContent className={cn(isFullscreen && "p-0 sm:p-0")}>
          {!isFullscreen && <MobileMonthCarousel
            type="expense"
            entries={displayData.expenses}
            bankAmount={displayData.bankAmount}
            months={months}
            currentMonth={currentMonth}
            currentYear={currentYear}
            tourPreview={tourPreview}
          />}
          <div className="relative">
           <div
             className={cn(
              "overflow-x-auto rounded-lg border border-border shadow-sm bg-card",
               isFullscreen ? "block overflow-x-auto rounded-none border-0 shadow-none" : "hidden md:block"
              )}
           >
             <table className={cn("w-full table-fixed border-collapse min-w-[1040px] text-xs sm:text-sm leading-tight", isFullscreen && "min-w-[720px] text-[10px] sm:text-xs")}>
              <thead
                className={cn(
                  "text-[11px] uppercase tracking-wide",
                  isFullscreen && "sticky top-0 z-30 shadow-sm"
                )}
              >
                <tr
                  className={cn(
                    "bg-muted border-b border-border",
                    isFullscreen &&
                      "backdrop-blur supports-[backdrop-filter]:bg-muted/90"
                  )}
                >
                  <th
                    className={cn(
                      "sticky left-0 z-20 w-[200px] min-w-[200px] max-w-[200px] border-r border-border bg-muted text-left px-2 py-2 font-semibold",
                       isFullscreen && "min-w-[95px] px-1.5 py-1",
                      "text-soft-shadow-strong"
                    )}
                  >
                    {t("entries.description")}
                  </th>
                  {months.map((month, monthIndex) => {
                    const isCurrent =
                      month.year === currentYear &&
                      month.month === currentMonth;
                    const previousMonth = months[monthIndex - 1];
                    const showYear = monthIndex === 0 || month.year !== previousMonth?.year;
                    return (
                      <th
                        key={month.label}
                        className={cn(
                          "text-center px-2 py-2 font-semibold min-w-[70px] relative text-soft-shadow",
                            isFullscreen && "min-w-[52px] px-1 py-1",
                            isCurrent && "text-primary-contrast bg-primary/5"
                        )}
                      >
                         {month.label}{showYear ? ` '${String(month.year).slice(-2)}` : ""}
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
                    <td className={cn("sticky left-0 z-10 w-[200px] min-w-[200px] max-w-[200px] border-r border-border bg-muted px-2 py-2 font-medium text-soft-shadow-strong", isFullscreen && "px-1.5 py-1 text-[10px] sm:text-xs")}>
                      <span className="block truncate text-foreground" title={expense.description || t("entries.noDescription")}>
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
                            isFullscreen && "px-1 py-1 text-[10px] sm:text-xs",
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

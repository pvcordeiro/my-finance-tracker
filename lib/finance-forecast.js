/**
 * Past planned months have no reliable opening balance in the data model.
 * Forecast the current and future months from the live bank balance instead
 * of adding historical planned values to today's actual balance.
 */
export function buildMonthlyForecast(months, bankAmount, currentYear, currentMonth) {
  let currentIndex = months.findIndex((month) => month.year > currentYear ||
    (month.year === currentYear && month.calendarMonth >= currentMonth));
  if (currentIndex < 0 && months.length) currentIndex = 0;
  let runningBalance = Number(bankAmount) || 0;
  return months.map((month) => {
    const net = (Number(month.income) || 0) - (Number(month.expenses) || 0);
    const isForecast = month.monthIndex >= currentIndex;
    if (!isForecast) return { ...month, net, balance: null, isForecast: false };
    runningBalance += net;
    return { ...month, net, balance: runningBalance, isForecast: true };
  });
}

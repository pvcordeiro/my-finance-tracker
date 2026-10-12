/**
 * Backfill rolling-window slots that have no year-specific occurrence using
 * legacy calendar-month records. Legacy rows are supplied newest-first so
 * duplicate calendar months use the most recent stored value.
 */
export function backfillLegacyRollingAmounts(amounts, matchedSlots, legacyRows, slots) {
  const result = [...amounts];
  const latestByMonth = new Map();

  for (const row of legacyRows) {
    if (!latestByMonth.has(row.month)) {
      latestByMonth.set(row.month, Number(row.amount) || 0);
    }
  }

  for (let index = 0; index < slots.length; index++) {
    if (matchedSlots[index]) continue;
    const amount = latestByMonth.get(slots[index].month);
    if (amount !== undefined) result[index] = amount;
  }

  return result;
}

export function findNextUnresolvedAmount(amounts, resolved = [], dismissed = []) {
  return amounts.findIndex((amount, index) =>
    Number(amount) !== 0 && !resolved[index] && !dismissed[index]
  );
}

export function getNextUnresolvedOccurrence(entry, baseDate = new Date()) {
  const monthIndex = findNextUnresolvedAmount(entry.amounts, entry.resolved, entry.dismissed);
  if (monthIndex < 0) return null;
  const target = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthIndex, 1);
  return {
    monthIndex,
    year: target.getFullYear(),
    month: target.getMonth() + 1,
    amount: Number(entry.amounts[monthIndex]) || 0,
    occurrenceId: entry.occurrenceIds?.[monthIndex] ?? null,
  };
}

export function resolveRollingOccurrence(entry, monthIndex, year, month) {
  const target = new Date(year, month - 1, 1);
  const now = new Date();
  const expected = new Date(now.getFullYear(), now.getMonth() + monthIndex, 1);
  if (target.getFullYear() !== expected.getFullYear() || target.getMonth() !== expected.getMonth()) {
    throw new Error("The selected occurrence does not match its rolling month slot");
  }
  if (!entry.amounts[monthIndex] || entry.resolved?.[monthIndex] || entry.dismissed?.[monthIndex]) {
    throw new Error("The selected occurrence is not eligible for resolution");
  }
  const resolved = [...(entry.resolved || Array(12).fill(false))];
  const amounts = [...entry.amounts];
  resolved[monthIndex] = true;
  amounts[monthIndex] = 0;
  return { ...entry, amounts, resolved };
}

export function applyOccurrenceToBalance(currentBalance, type, amount) {
  const current = Number(currentBalance) || 0;
  const delta = (type === "income" ? 1 : -1) * (Number(amount) || 0);
  const nextBalance = Math.max(0, current + delta);
  return { nextBalance, appliedDelta: nextBalance - current };
}

export function projectOccurrenceAmount(amount, resolved = false, dismissed = false) {
  return resolved || dismissed ? 0 : Number(amount) || 0;
}

export function buildResolutionResponse(isResolved, bankUpdate) {
  return {
    success: true,
    updates: {},
    ...(isResolved && bankUpdate
      ? { bankAmount: bankUpdate.bankAmount, alreadyResolved: bankUpdate.alreadyResolved }
      : {}),
  };
}

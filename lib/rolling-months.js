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

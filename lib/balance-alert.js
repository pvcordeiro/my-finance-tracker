export function getProjectedBalanceAlert(projectedMonths, threshold) {
  const firstBelowThreshold = projectedMonths.find(
    (month) => month.balance < threshold
  );
  const firstNegative = projectedMonths.find((month) => month.balance < 0);

  if (!firstBelowThreshold && !firstNegative) return null;

  if (
    firstNegative &&
    (!firstBelowThreshold || firstNegative === firstBelowThreshold)
  ) {
    return {
      type: "negative",
      month: firstNegative,
      firstNegative,
    };
  }

  return {
    type: "below-minimum",
    month: firstBelowThreshold,
    firstNegative,
  };
}

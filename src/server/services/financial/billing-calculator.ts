/**
 * Calculates the billable duration for a visit.
 *
 * Logic:
 * 1. Compute raw duration in minutes between start and end
 * 2. Apply minimum billable minutes (floor)
 * 3. Round UP to the nearest rounding increment
 */
export function calculateBillingDuration(
  startTime: Date,
  endTime: Date,
  minimumMinutes: number,
  roundingIncrementMinutes: number,
): number {
  const rawMs = endTime.getTime() - startTime.getTime();
  const rawMinutes = Math.max(0, rawMs / 60_000);

  // Apply minimum
  const afterMinimum = Math.max(rawMinutes, minimumMinutes);

  // Round UP to nearest increment
  if (roundingIncrementMinutes <= 0) return Math.ceil(afterMinimum);
  return (
    Math.ceil(afterMinimum / roundingIncrementMinutes) *
    roundingIncrementMinutes
  );
}

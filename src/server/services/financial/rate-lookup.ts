import type { Decimal } from "@prisma/client/runtime/library";
import type { DayType } from "@prisma/client";

export interface RateCardLineInput {
  dayType: DayType;
  timeBandStart: string | null;
  timeBandEnd: string | null;
  ratePerHour: Decimal;
  carersRequired: number;
}

/**
 * Finds the applicable rate from rate card lines for a given visit.
 *
 * Priority:
 * 1. Exact dayType + exact carersRequired + matching time band
 * 2. Exact dayType + carersRequired=1 fallback + matching time band
 * 3. null if no match
 */
export function lookupRate(
  rateCardLines: RateCardLineInput[],
  dayType: DayType,
  visitStartTime: string, // "HH:mm"
  carersRequired: number,
): Decimal | null {
  const dayLines = rateCardLines.filter((l) => l.dayType === dayType);
  if (dayLines.length === 0) return null;

  // Try exact carer count first, then fallback to 1
  const carerPriorities =
    carersRequired === 1 ? [1] : [carersRequired, 1];

  for (const carerCount of carerPriorities) {
    const carerLines = dayLines.filter(
      (l) => l.carersRequired === carerCount,
    );
    if (carerLines.length === 0) continue;

    // Check if any lines have time bands defined
    const bandedLines = carerLines.filter(
      (l) => l.timeBandStart !== null && l.timeBandEnd !== null,
    );

    if (bandedLines.length > 0) {
      // Find matching time band
      const match = bandedLines.find((l) =>
        isTimeInBand(visitStartTime, l.timeBandStart!, l.timeBandEnd!),
      );
      if (match) return match.ratePerHour;
    } else {
      // No time bands — use the all-day rate (first match)
      return carerLines[0].ratePerHour;
    }
  }

  return null;
}

/**
 * Checks if a time falls within a band, handling overnight bands
 * (e.g., "20:00" to "06:00").
 */
function isTimeInBand(
  time: string,
  bandStart: string,
  bandEnd: string,
): boolean {
  const t = timeToMinutes(time);
  const s = timeToMinutes(bandStart);
  const e = timeToMinutes(bandEnd);

  if (s <= e) {
    // Normal band: e.g. 06:00 - 20:00
    return t >= s && t < e;
  } else {
    // Overnight band: e.g. 20:00 - 06:00
    return t >= s || t < e;
  }
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export interface RotaVisitRow {
  id: string;
  visitDate: Date;
  startTime: string;
  endTime: string;
  carersRequired: number;
  status: string;
  serviceUser: { id: string; firstName: string; lastName: string; area?: string | null };
  assignments: { staffMember: { id: string; firstName: string; lastName: string } }[];
}

export interface Round {
  area: string;
  roundIndex: number;
  visits: RotaVisitRow[];
}

function visitsOverlap(a: RotaVisitRow, b: RotaVisitRow): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

/**
 * Greedily packs visits (sorted by start time) into the minimum number of
 * non-overlapping vertical lanes — first-fit: each visit joins the first
 * existing lane whose visits don't time-overlap it, else starts a new lane.
 * Two references to the SAME visit object trivially "overlap" each other,
 * so they're guaranteed to land in different lanes with no extra
 * bookkeeping — this is what buildRounds relies on for multi-carer visits,
 * and what the timeline view relies on for a genuinely double-booked slot.
 */
export function packIntoLanes(visits: RotaVisitRow[]): RotaVisitRow[][] {
  const sorted = [...visits].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const lanes: RotaVisitRow[][] = [];
  for (const visit of sorted) {
    const lane = lanes.find((l) => !l.some((v) => visitsOverlap(v, visit)));
    if (lane) lane.push(visit);
    else lanes.push([visit]);
  }
  return lanes;
}

/**
 * Groups visits by client area, then within each area packs them into lanes
 * via packIntoLanes — each lane becomes a "round", a plausible single-person
 * sequential route for that area that day.
 */
export function buildRounds(visits: RotaVisitRow[]): Round[] {
  // A visit needing K carers must occupy a slot in K different rounds (each
  // representing a different person's route) — expand it into K references
  // to the same visit before packing (see packIntoLanes for why this works).
  const expanded = visits.flatMap((v) => Array(v.carersRequired).fill(v));

  const byArea = new Map<string, RotaVisitRow[]>();
  for (const visit of expanded) {
    const key = visit.serviceUser.area?.trim() || "No area set";
    byArea.set(key, [...(byArea.get(key) ?? []), visit]);
  }

  const rounds: Round[] = [];
  for (const [area, areaVisits] of byArea) {
    packIntoLanes(areaVisits).forEach((laneVisits, roundIndex) => rounds.push({ area, roundIndex, visits: laneVisits }));
  }
  return rounds;
}

export interface VisitStatusInfo {
  label: string;
  className: string;
}

/** Plain-language label + Tailwind color classes for a visit's current
 * assignment status — shared by every place a visit gets rendered as a
 * badge/block (the day list, the timeline). */
export function visitStatusInfo(visit: RotaVisitRow): VisitStatusInfo {
  if (visit.status === "CANCELLED") {
    return { label: "Cancelled", className: "bg-muted text-muted-foreground border-border" };
  }
  const assigned = visit.assignments.length;
  if (assigned === 0) {
    return { label: "Unassigned", className: "bg-orange-100 text-orange-800 border-orange-300" };
  }
  if (assigned < visit.carersRequired) {
    return {
      label: `${assigned} of ${visit.carersRequired} carers assigned`,
      className: "bg-blue-100 text-blue-800 border-blue-300",
    };
  }
  return { label: "Fully assigned", className: "bg-green-100 text-green-800 border-green-300" };
}

/** True while any visit in the list still needs more carers assigned —
 * used to decide whether a staff/client card should auto-collapse (nothing
 * left to act on) or stay expanded (something still needs attention). */
export function needsAttention(visits: RotaVisitRow[]): boolean {
  return visits.some((v) => v.status !== "CANCELLED" && v.assignments.length < v.carersRequired);
}

export interface ContinuityIssue {
  serviceUser: { id: string; firstName: string; lastName: string };
  staffCount: number;
}

/** Flags clients whose assigned visits that day involve more than one distinct staff member. */
export function findContinuityIssues(visits: RotaVisitRow[]): ContinuityIssue[] {
  const byClient = new Map<string, { serviceUser: RotaVisitRow["serviceUser"]; staffIds: Set<string> }>();
  for (const visit of visits) {
    if (visit.status === "CANCELLED" || visit.assignments.length === 0) continue;
    const entry = byClient.get(visit.serviceUser.id) ?? { serviceUser: visit.serviceUser, staffIds: new Set<string>() };
    visit.assignments.forEach((a) => entry.staffIds.add(a.staffMember.id));
    byClient.set(visit.serviceUser.id, entry);
  }
  return [...byClient.values()]
    .filter((e) => e.staffIds.size > 1)
    .map((e) => ({ serviceUser: e.serviceUser, staffCount: e.staffIds.size }));
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export interface DayTimeRange {
  startMinutes: number;
  endMinutes: number;
}

const DEFAULT_RANGE_START = 8 * 60; // 08:00
const DEFAULT_RANGE_END = 18 * 60; // 18:00
const MINUTES_PER_HOUR = 60;

/**
 * The [start, end] axis (minutes since midnight) for a day's timeline view.
 * Defaults to 08:00-18:00 and only expands outward — floored/ceiled to the
 * nearest hour — when an actual non-cancelled visit falls outside that
 * window, so a normal day never needs scrolling and an early/late visit is
 * never clipped. Deliberately driven by visits only, not RotaAvailability
 * (which can legitimately span much wider hours) — availability bars get
 * clamped into whatever range this produces rather than stretching the axis.
 */
export function computeDayTimeRange(dayVisits: RotaVisitRow[]): DayTimeRange {
  const active = dayVisits.filter((v) => v.status !== "CANCELLED");
  if (active.length === 0) {
    return { startMinutes: DEFAULT_RANGE_START, endMinutes: DEFAULT_RANGE_END };
  }
  const earliest = Math.floor(Math.min(...active.map((v) => toMinutes(v.startTime))) / MINUTES_PER_HOUR) * MINUTES_PER_HOUR;
  const latest = Math.ceil(Math.max(...active.map((v) => toMinutes(v.endTime))) / MINUTES_PER_HOUR) * MINUTES_PER_HOUR;
  return {
    startMinutes: Math.min(earliest, DEFAULT_RANGE_START),
    endMinutes: Math.max(latest, DEFAULT_RANGE_END),
  };
}

/**
 * Returns the gap in minutes between each consecutive pair in a
 * chronologically-sorted visit list — index i is the gap between visits[i]
 * and visits[i+1]. `null` when the gap isn't positive (back-to-back or
 * overlapping — overlap is already surfaced elsewhere as a conflict).
 */
export function computeVisitGaps(sortedVisits: RotaVisitRow[]): (number | null)[] {
  return sortedVisits.slice(0, -1).map((visit, i) => {
    const gap = toMinutes(sortedVisits[i + 1].startTime) - toMinutes(visit.endTime);
    return gap > 0 ? gap : null;
  });
}

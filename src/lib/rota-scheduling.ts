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
 * Groups visits by client area, then within each area greedily packs visits
 * (sorted by start time) into the first existing round whose visits don't
 * time-overlap the new one — otherwise starts a new round. Each round is a
 * plausible single-person sequential route for that area that day.
 */
export function buildRounds(visits: RotaVisitRow[]): Round[] {
  const byArea = new Map<string, RotaVisitRow[]>();
  for (const visit of visits) {
    const key = visit.serviceUser.area?.trim() || "No area set";
    byArea.set(key, [...(byArea.get(key) ?? []), visit]);
  }

  const rounds: Round[] = [];
  for (const [area, areaVisits] of byArea) {
    const sorted = [...areaVisits].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const buckets: RotaVisitRow[][] = [];
    for (const visit of sorted) {
      const bucket = buckets.find((b) => !b.some((v) => visitsOverlap(v, visit)));
      if (bucket) bucket.push(visit);
      else buckets.push([visit]);
    }
    buckets.forEach((bucketVisits, roundIndex) => rounds.push({ area, roundIndex, visits: bucketVisits }));
  }
  return rounds;
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

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
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

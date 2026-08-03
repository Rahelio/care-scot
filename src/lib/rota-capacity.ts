import { toMinutes, type RotaVisitRow } from "./rota-scheduling";

export interface CapacityStaffRow {
  id: string;
  // Prisma Decimal fields can arrive as number, string, or a Decimal-like
  // object depending on serialization — Number(...) coerces all of them,
  // matching how this field is already consumed elsewhere in the app
  // (e.g. staff/[id]/page.tsx does `Number(member.contractHoursPerWeek)`).
  contractHoursPerWeek: unknown;
}

export interface AreaHours {
  area: string;
  requiredHours: number;
}

export interface CapacitySummary {
  availableHours: number;
  staffMissingContractHours: number;
  requiredHours: number;
  spareHours: number;
  unassignedHours: number;
  byArea: AreaHours[];
}

function hoursOf(visit: RotaVisitRow): number {
  return ((toMinutes(visit.endTime) - toMinutes(visit.startTime)) * visit.carersRequired) / 60;
}

/**
 * Computes a week's staffing capacity picture entirely from data already
 * loaded by the rota page (getGridData's visits + staff.list) — no separate
 * backend query. Required hours are weighted by carersRequired so a
 * multi-carer visit isn't understated, mirroring the same fix applied to
 * buildRounds for the same reason.
 */
export function computeCapacitySummary(visits: RotaVisitRow[], staff: CapacityStaffRow[]): CapacitySummary {
  const staffWithHours = staff.filter((s) => s.contractHoursPerWeek != null);
  const availableHours = staffWithHours.reduce((sum, s) => sum + Number(s.contractHoursPerWeek), 0);
  const staffMissingContractHours = staff.length - staffWithHours.length;

  const active = visits.filter((v) => v.status !== "CANCELLED");
  const requiredHours = active.reduce((sum, v) => sum + hoursOf(v), 0);

  const unassignedHours = active
    .filter((v) => v.assignments.length < v.carersRequired)
    .reduce((sum, v) => sum + (hoursOf(v) * (v.carersRequired - v.assignments.length)) / v.carersRequired, 0);

  const byAreaMap = new Map<string, number>();
  for (const visit of active) {
    const area = visit.serviceUser.area?.trim() || "No area set";
    byAreaMap.set(area, (byAreaMap.get(area) ?? 0) + hoursOf(visit));
  }

  return {
    availableHours,
    staffMissingContractHours,
    requiredHours,
    spareHours: availableHours - requiredHours,
    unassignedHours,
    byArea: [...byAreaMap.entries()]
      .map(([area, requiredHours]) => ({ area, requiredHours }))
      .sort((a, b) => b.requiredHours - a.requiredHours),
  };
}

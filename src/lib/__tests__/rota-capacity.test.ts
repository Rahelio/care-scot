import { describe, it, expect } from "vitest";
import { computeCapacitySummary } from "../rota-capacity";
import type { RotaVisitRow } from "../rota-scheduling";

function visit(overrides: Partial<RotaVisitRow> & { id: string }): RotaVisitRow {
  return {
    visitDate: new Date("2026-08-03"),
    startTime: "09:00",
    endTime: "10:00", // 1 hour
    carersRequired: 1,
    status: "UNASSIGNED",
    serviceUser: { id: "client-1", firstName: "Mary", lastName: "MacDonald", area: "East" },
    assignments: [],
    ...overrides,
  };
}

describe("computeCapacitySummary", () => {
  it("sums available hours across staff who have contractHoursPerWeek set", () => {
    const summary = computeCapacitySummary([], [
      { id: "s1", contractHoursPerWeek: 37.5 },
      { id: "s2", contractHoursPerWeek: "20" },
      { id: "s3", contractHoursPerWeek: null },
    ]);
    expect(summary.availableHours).toBe(57.5);
    expect(summary.staffMissingContractHours).toBe(1);
  });

  it("weights required hours by carersRequired", () => {
    const summary = computeCapacitySummary(
      [visit({ id: "v1", carersRequired: 2 })], // 1hr * 2 carers = 2 hours
      [],
    );
    expect(summary.requiredHours).toBe(2);
  });

  it("excludes cancelled visits from required hours", () => {
    const summary = computeCapacitySummary(
      [visit({ id: "v1", status: "CANCELLED" })],
      [],
    );
    expect(summary.requiredHours).toBe(0);
  });

  it("computes negative spare capacity when required exceeds available", () => {
    const summary = computeCapacitySummary(
      [visit({ id: "v1" }), visit({ id: "v2" })], // 2 hours required
      [{ id: "s1", contractHoursPerWeek: 1 }],
    );
    expect(summary.spareHours).toBe(-1);
  });

  it("computes unassigned hours proportional to missing carer slots", () => {
    const summary = computeCapacitySummary(
      [visit({ id: "v1", carersRequired: 2, assignments: [{ staffMember: { id: "s1", firstName: "A", lastName: "B" } }] })],
      [],
    );
    // 2-hour total requirement, 1 of 2 slots filled -> 1 hour unassigned
    expect(summary.unassignedHours).toBe(1);
  });

  it("breaks down required hours by area, sorted descending", () => {
    const summary = computeCapacitySummary(
      [
        visit({ id: "v1", serviceUser: { id: "c1", firstName: "A", lastName: "B", area: "East" } }),
        visit({ id: "v2", serviceUser: { id: "c2", firstName: "C", lastName: "D", area: "West" }, startTime: "09:00", endTime: "11:00" }),
      ],
      [],
    );
    expect(summary.byArea).toEqual([
      { area: "West", requiredHours: 2 },
      { area: "East", requiredHours: 1 },
    ]);
  });
});

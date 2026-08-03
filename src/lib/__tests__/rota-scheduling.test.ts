import { describe, it, expect } from "vitest";
import { buildRounds, findContinuityIssues, computeVisitGaps, packIntoLanes, computeDayTimeRange, type RotaVisitRow } from "../rota-scheduling";

function visit(overrides: Partial<RotaVisitRow> & { id: string }): RotaVisitRow {
  return {
    visitDate: new Date("2026-08-03"),
    startTime: "09:00",
    endTime: "10:00",
    carersRequired: 1,
    status: "UNASSIGNED",
    serviceUser: { id: "client-1", firstName: "Mary", lastName: "MacDonald", area: "Inverness East" },
    assignments: [],
    ...overrides,
  };
}

describe("buildRounds", () => {
  it("packs two non-overlapping same-area visits into one round", () => {
    const visits = [
      visit({ id: "v1", startTime: "09:00", endTime: "10:00" }),
      visit({ id: "v2", startTime: "10:00", endTime: "11:00" }),
    ];
    const rounds = buildRounds(visits);
    expect(rounds).toHaveLength(1);
    expect(rounds[0].visits.map((v) => v.id)).toEqual(["v1", "v2"]);
  });

  it("splits two overlapping same-area visits into two rounds", () => {
    const visits = [
      visit({ id: "v1", startTime: "09:00", endTime: "10:00" }),
      visit({ id: "v2", startTime: "09:30", endTime: "10:30" }),
    ];
    const rounds = buildRounds(visits);
    expect(rounds).toHaveLength(2);
    expect(rounds.map((r) => r.visits.length)).toEqual([1, 1]);
  });

  it("groups visits into separate rounds per area", () => {
    const visits = [
      visit({ id: "v1", startTime: "09:00", endTime: "10:00", serviceUser: { id: "c1", firstName: "A", lastName: "B", area: "East" } }),
      visit({ id: "v2", startTime: "09:00", endTime: "10:00", serviceUser: { id: "c2", firstName: "C", lastName: "D", area: "West" } }),
    ];
    const rounds = buildRounds(visits);
    expect(rounds).toHaveLength(2);
    expect(rounds.map((r) => r.area).sort()).toEqual(["East", "West"]);
  });

  it("splits a multi-carer visit into two separate rounds", () => {
    const visits = [visit({ id: "v1", carersRequired: 2 })];
    const rounds = buildRounds(visits);
    expect(rounds).toHaveLength(2);
    expect(rounds[0].visits).toEqual([visits[0]]);
    expect(rounds[1].visits).toEqual([visits[0]]);
  });

  it("keeps a multi-carer visit's two slots separate from an unrelated overlapping visit", () => {
    const doubleUp = visit({ id: "v1", carersRequired: 2, startTime: "09:00", endTime: "10:00" });
    const other = visit({ id: "v2", startTime: "09:30", endTime: "10:30" });
    const rounds = buildRounds([doubleUp, other]);
    // v1 needs 2 rounds; v2 overlaps v1 so can't join either of v1's rounds,
    // and there's no third round for it to overlap with, so it gets its own.
    expect(rounds).toHaveLength(3);
    expect(rounds.filter((r) => r.visits.some((v) => v.id === "v1"))).toHaveLength(2);
    expect(rounds.filter((r) => r.visits.some((v) => v.id === "v2"))).toHaveLength(1);
  });

  it("falls back to a single 'No area set' group when area is missing", () => {
    const visits = [
      visit({ id: "v1", serviceUser: { id: "c1", firstName: "A", lastName: "B", area: null } }),
    ];
    const rounds = buildRounds(visits);
    expect(rounds[0].area).toBe("No area set");
  });
});

describe("findContinuityIssues", () => {
  it("flags a client with two different assigned carers that day", () => {
    const visits = [
      visit({ id: "v1", assignments: [{ staffMember: { id: "s1", firstName: "Janet", lastName: "Morrison" } }] }),
      visit({ id: "v2", startTime: "14:00", endTime: "15:00", assignments: [{ staffMember: { id: "s2", firstName: "Alan", lastName: "McGregor" } }] }),
    ];
    const issues = findContinuityIssues(visits);
    expect(issues).toHaveLength(1);
    expect(issues[0].staffCount).toBe(2);
    expect(issues[0].serviceUser.id).toBe("client-1");
  });

  it("does not flag a client with one consistent carer across visits", () => {
    const visits = [
      visit({ id: "v1", assignments: [{ staffMember: { id: "s1", firstName: "Janet", lastName: "Morrison" } }] }),
      visit({ id: "v2", startTime: "14:00", endTime: "15:00", assignments: [{ staffMember: { id: "s1", firstName: "Janet", lastName: "Morrison" } }] }),
    ];
    expect(findContinuityIssues(visits)).toHaveLength(0);
  });

  it("ignores unassigned and cancelled visits", () => {
    const visits = [
      visit({ id: "v1", assignments: [] }),
      visit({ id: "v2", status: "CANCELLED", assignments: [{ staffMember: { id: "s2", firstName: "Alan", lastName: "McGregor" } }] }),
    ];
    expect(findContinuityIssues(visits)).toHaveLength(0);
  });
});

describe("computeVisitGaps", () => {
  it("returns a positive gap in minutes between consecutive visits", () => {
    const visits = [
      visit({ id: "v1", startTime: "09:00", endTime: "10:00" }),
      visit({ id: "v2", startTime: "10:45", endTime: "11:30" }),
    ];
    expect(computeVisitGaps(visits)).toEqual([45]);
  });

  it("returns null for back-to-back visits", () => {
    const visits = [
      visit({ id: "v1", startTime: "09:00", endTime: "10:00" }),
      visit({ id: "v2", startTime: "10:00", endTime: "11:00" }),
    ];
    expect(computeVisitGaps(visits)).toEqual([null]);
  });

  it("returns null for overlapping visits", () => {
    const visits = [
      visit({ id: "v1", startTime: "09:00", endTime: "10:00" }),
      visit({ id: "v2", startTime: "09:30", endTime: "10:30" }),
    ];
    expect(computeVisitGaps(visits)).toEqual([null]);
  });
});

describe("packIntoLanes", () => {
  it("packs two non-overlapping visits into one lane", () => {
    const visits = [
      visit({ id: "v1", startTime: "09:00", endTime: "10:00" }),
      visit({ id: "v2", startTime: "10:00", endTime: "11:00" }),
    ];
    const lanes = packIntoLanes(visits);
    expect(lanes).toHaveLength(1);
    expect(lanes[0].map((v) => v.id)).toEqual(["v1", "v2"]);
  });

  it("splits two overlapping visits into two lanes", () => {
    const visits = [
      visit({ id: "v1", startTime: "09:00", endTime: "10:00" }),
      visit({ id: "v2", startTime: "09:30", endTime: "10:30" }),
    ];
    const lanes = packIntoLanes(visits);
    expect(lanes).toHaveLength(2);
  });

  it("needs a third lane when three visits mutually overlap", () => {
    const visits = [
      visit({ id: "v1", startTime: "09:00", endTime: "10:00" }),
      visit({ id: "v2", startTime: "09:30", endTime: "10:30" }), // overlaps v1
      visit({ id: "v3", startTime: "09:45", endTime: "10:15" }), // overlaps both v1 and v2
    ];
    const lanes = packIntoLanes(visits);
    expect(lanes).toHaveLength(3);
    expect(lanes.map((lane) => lane.map((v) => v.id))).toEqual([["v1"], ["v2"], ["v3"]]);
  });

  it("reuses an earlier lane once it frees up (first-fit, not a fixed per-visit lane)", () => {
    const visits = [
      visit({ id: "v1", startTime: "09:00", endTime: "10:00" }),
      visit({ id: "v2", startTime: "09:30", endTime: "10:30" }), // overlaps v1 -> lane 2
      visit({ id: "v3", startTime: "10:00", endTime: "11:00" }), // doesn't overlap v1 -> joins lane 1
    ];
    const lanes = packIntoLanes(visits);
    expect(lanes).toHaveLength(2);
    expect(lanes[0].map((v) => v.id)).toEqual(["v1", "v3"]);
    expect(lanes[1].map((v) => v.id)).toEqual(["v2"]);
  });
});

describe("computeDayTimeRange", () => {
  it("defaults to 08:00-18:00 when there are no visits", () => {
    expect(computeDayTimeRange([])).toEqual({ startMinutes: 8 * 60, endMinutes: 18 * 60 });
  });

  it("keeps the default range when all visits fall inside it", () => {
    const visits = [visit({ id: "v1", startTime: "09:00", endTime: "10:00" })];
    expect(computeDayTimeRange(visits)).toEqual({ startMinutes: 8 * 60, endMinutes: 18 * 60 });
  });

  it("floors the start outward to the nearest hour for an early visit", () => {
    const visits = [visit({ id: "v1", startTime: "07:10", endTime: "08:00" })];
    expect(computeDayTimeRange(visits)).toEqual({ startMinutes: 7 * 60, endMinutes: 18 * 60 });
  });

  it("ceils the end outward to the nearest hour for a late visit", () => {
    const visits = [visit({ id: "v1", startTime: "18:00", endTime: "19:10" })];
    expect(computeDayTimeRange(visits)).toEqual({ startMinutes: 8 * 60, endMinutes: 20 * 60 });
  });

  it("does not widen the range for a visit exactly on the default boundary", () => {
    const visits = [visit({ id: "v1", startTime: "08:00", endTime: "09:00" })];
    expect(computeDayTimeRange(visits)).toEqual({ startMinutes: 8 * 60, endMinutes: 18 * 60 });
  });

  it("ignores cancelled visits outside the default window", () => {
    const visits = [visit({ id: "v1", status: "CANCELLED", startTime: "04:00", endTime: "05:00" })];
    expect(computeDayTimeRange(visits)).toEqual({ startMinutes: 8 * 60, endMinutes: 18 * 60 });
  });
});

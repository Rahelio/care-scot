import { describe, it, expect } from "vitest";
import { buildRounds, findContinuityIssues, computeVisitGaps, type RotaVisitRow } from "../rota-scheduling";

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

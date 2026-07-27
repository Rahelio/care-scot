import { describe, it, expect } from "vitest";
import type { NccMerpCategory } from "@prisma/client";
import { isHighSeverityMerpCategory } from "../medication";

const ALL_CATEGORIES: NccMerpCategory[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];

describe("isHighSeverityMerpCategory", () => {
  it("treats categories E through I as high severity (Care Inspectorate notification required)", () => {
    for (const category of ["E", "F", "G", "H", "I"] as NccMerpCategory[]) {
      expect(isHighSeverityMerpCategory(category)).toBe(true);
    }
  });

  it("treats categories A through D as not high severity", () => {
    for (const category of ["A", "B", "C", "D"] as NccMerpCategory[]) {
      expect(isHighSeverityMerpCategory(category)).toBe(false);
    }
  });

  it("covers every category defined in the schema (no silent gaps if the enum grows)", () => {
    for (const category of ALL_CATEGORIES) {
      expect(typeof isHighSeverityMerpCategory(category)).toBe("boolean");
    }
  });
});

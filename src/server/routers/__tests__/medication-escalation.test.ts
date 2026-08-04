import { describe, it, expect } from "vitest";
import type { NccMerpCategory } from "@prisma/client";
import { isHighSeverityMerpCategory, validateAdministration } from "../medication";

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

describe("validateAdministration — controlled drug witness / PRN reason rules", () => {
  const base = {
    isControlledDrug: true,
    isPrn: false,
    administered: true,
    administeringStaffMemberId: "staff-1",
  };

  it("rejects a controlled drug administration with no witness", () => {
    expect(validateAdministration({ ...base, witnessId: undefined })).toMatch(/witness is required/i);
  });

  it("rejects the administering staff member witnessing their own controlled-drug administration", () => {
    expect(validateAdministration({ ...base, witnessId: "staff-1" })).toMatch(
      /must be a different staff member/i,
    );
  });

  it("accepts a controlled drug administration witnessed by a different staff member", () => {
    expect(validateAdministration({ ...base, witnessId: "staff-2" })).toBeNull();
  });

  it("rejects a PRN administration with no reason given", () => {
    expect(
      validateAdministration({
        isControlledDrug: false,
        isPrn: true,
        administered: true,
        administeringStaffMemberId: "staff-1",
        prnReasonGiven: undefined,
      }),
    ).toMatch(/reason is required for PRN/i);
  });

  it("skips all checks when the medication was not administered (refused / not available)", () => {
    expect(
      validateAdministration({
        isControlledDrug: true,
        isPrn: true,
        administered: false,
        administeringStaffMemberId: "staff-1",
        witnessId: undefined,
        prnReasonGiven: undefined,
      }),
    ).toBeNull();
  });
});

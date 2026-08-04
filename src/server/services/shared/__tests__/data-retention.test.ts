import { describe, it, expect } from "vitest";
import { anonymisedServiceUserData, anonymisedStaffMemberData, RETENTION_YEARS } from "../data-retention";

describe("RETENTION_YEARS", () => {
  it("is the organisation's chosen 6-year post-discharge/departure period", () => {
    expect(RETENTION_YEARS).toBe(6);
  });
});

describe("anonymisedServiceUserData", () => {
  it("nulls every identifying field and marks the name as anonymised", () => {
    const data = anonymisedServiceUserData();
    expect(data.firstName).toBe("Erased");
    expect(data.lastName).toBe("Data Subject");
    for (const field of [
      "chiNumber",
      "addressLine1",
      "addressLine2",
      "city",
      "postcode",
      "phonePrimary",
      "phoneSecondary",
      "email",
      "niNumber",
      "gpName",
      "gpPractice",
      "gpPhone",
      "communicationNeeds",
      "culturalReligiousNeeds",
      "dietaryRequirements",
      "dailyRoutinePreferences",
      "advanceCarePlan",
      "dischargeReason",
    ] as const) {
      expect(data[field]).toBeNull();
    }
  });

  it("does not touch operational/statistical fields (status, dischargeDate, dateOfBirth)", () => {
    const data = anonymisedServiceUserData();
    expect(data).not.toHaveProperty("status");
    expect(data).not.toHaveProperty("dischargeDate");
    expect(data).not.toHaveProperty("dateOfBirth");
  });
});

describe("anonymisedStaffMemberData", () => {
  it("nulls every identifying field and marks the name as anonymised", () => {
    const data = anonymisedStaffMemberData();
    expect(data.firstName).toBe("Erased");
    expect(data.lastName).toBe("Data Subject");
    for (const field of [
      "dateOfBirth",
      "addressLine1",
      "addressLine2",
      "city",
      "postcode",
      "phone",
      "email",
      "niNumber",
      "rightToWorkDocument",
    ] as const) {
      expect(data[field]).toBeNull();
    }
  });

  it("does not touch operational fields (status, endDate, roleType, employmentType)", () => {
    const data = anonymisedStaffMemberData();
    expect(data).not.toHaveProperty("status");
    expect(data).not.toHaveProperty("endDate");
    expect(data).not.toHaveProperty("roleType");
    expect(data).not.toHaveProperty("employmentType");
  });
});

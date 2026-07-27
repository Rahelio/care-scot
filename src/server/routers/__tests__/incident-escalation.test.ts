import { describe, it, expect } from "vitest";
import type { IncidentSeverity, IncidentType } from "@prisma/client";
import { shouldEscalate, getCiNotificationType } from "../incidents";

const ALL_TYPES: IncidentType[] = [
  "ACCIDENT",
  "INCIDENT",
  "NEAR_MISS",
  "SAFEGUARDING",
  "MEDICATION_ERROR",
  "DEATH",
  "PROPERTY_DAMAGE",
  "MISSING_PERSON",
  "ASSAULT",
  "FIRE",
  "INFECTIOUS_OUTBREAK",
  "OTHER",
];
const ALL_SEVERITIES: IncidentSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

describe("shouldEscalate", () => {
  it("always escalates DEATH regardless of severity", () => {
    for (const severity of ALL_SEVERITIES) {
      expect(shouldEscalate("DEATH", severity)).toBe(true);
    }
  });

  it("always escalates INFECTIOUS_OUTBREAK regardless of severity", () => {
    for (const severity of ALL_SEVERITIES) {
      expect(shouldEscalate("INFECTIOUS_OUTBREAK", severity)).toBe(true);
    }
  });

  it("escalates ASSAULT only at HIGH or CRITICAL severity", () => {
    expect(shouldEscalate("ASSAULT", "LOW")).toBe(false);
    expect(shouldEscalate("ASSAULT", "MEDIUM")).toBe(false);
    expect(shouldEscalate("ASSAULT", "HIGH")).toBe(true);
    expect(shouldEscalate("ASSAULT", "CRITICAL")).toBe(true);
  });

  it("escalates SAFEGUARDING only at HIGH or CRITICAL severity", () => {
    expect(shouldEscalate("SAFEGUARDING", "LOW")).toBe(false);
    expect(shouldEscalate("SAFEGUARDING", "MEDIUM")).toBe(false);
    expect(shouldEscalate("SAFEGUARDING", "HIGH")).toBe(true);
    expect(shouldEscalate("SAFEGUARDING", "CRITICAL")).toBe(true);
  });

  it("never escalates any other incident type, at any severity", () => {
    const nonEscalatingTypes = ALL_TYPES.filter(
      (t) => !["DEATH", "INFECTIOUS_OUTBREAK", "ASSAULT", "SAFEGUARDING"].includes(t),
    );
    for (const type of nonEscalatingTypes) {
      for (const severity of ALL_SEVERITIES) {
        expect(shouldEscalate(type, severity)).toBe(false);
      }
    }
  });
});

describe("getCiNotificationType", () => {
  it("maps each escalating incident type to its Care Inspectorate notification type", () => {
    expect(getCiNotificationType("DEATH")).toBe("DEATH");
    expect(getCiNotificationType("ASSAULT")).toBe("SERIOUS_INCIDENT");
    expect(getCiNotificationType("SAFEGUARDING")).toBe("ABUSE_ALLEGATION");
    expect(getCiNotificationType("INFECTIOUS_OUTBREAK")).toBe("INFECTIOUS_OUTBREAK");
  });

  it("returns null for incident types that never trigger a CI notification", () => {
    const nonNotifyingTypes = ALL_TYPES.filter(
      (t) => !["DEATH", "ASSAULT", "SAFEGUARDING", "INFECTIOUS_OUTBREAK"].includes(t),
    );
    for (const type of nonNotifyingTypes) {
      expect(getCiNotificationType(type)).toBe(null);
    }
  });

  // Every type shouldEscalate() can return true for must have a non-null CI
  // notification type — otherwise the router's `if (ciType)` guard silently
  // skips creating the notification for an incident it just decided to escalate.
  it("never returns null for a type/severity combination that shouldEscalate() escalates", () => {
    for (const type of ALL_TYPES) {
      for (const severity of ALL_SEVERITIES) {
        if (shouldEscalate(type, severity)) {
          expect(getCiNotificationType(type)).not.toBe(null);
        }
      }
    }
  });
});

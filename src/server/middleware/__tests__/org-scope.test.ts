import { describe, it, expect } from "vitest";
import { applyOrgScope, ORG_SCOPED_MODELS } from "../org-scope";

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";

describe("applyOrgScope", () => {
  it("passes through unscoped models unchanged", () => {
    const args = { where: { id: "abc" } };
    const result = applyOrgScope("Organisation", "findUnique", args, ORG_A);
    expect(result).toEqual(args);
    expect(result.where).not.toHaveProperty("organisationId");
  });

  describe.each(["findMany", "findFirst", "count", "aggregate", "groupBy", "updateMany", "deleteMany"])(
    "list/count/many-write op: %s",
    (operation) => {
      it("injects organisationId into where", () => {
        const result = applyOrgScope("ServiceUser", operation, { where: { status: "ACTIVE" } }, ORG_A);
        expect(result.where).toEqual({ status: "ACTIVE", organisationId: ORG_A });
      });

      it("overrides a client-supplied organisationId rather than trusting it — this is the exact IDOR this middleware exists to prevent", () => {
        const result = applyOrgScope(
          "ServiceUser",
          operation,
          { where: { organisationId: ORG_B } },
          ORG_A,
        );
        expect(result.where).toEqual({ organisationId: ORG_A });
      });
    },
  );

  describe.each(["findUnique", "findUniqueOrThrow", "update", "delete", "upsert"])(
    "single-record op: %s",
    (operation) => {
      it("appends organisationId to where, narrowing rather than replacing the unique key", () => {
        const result = applyOrgScope("StaffMember", operation, { where: { id: "staff-1" } }, ORG_A);
        expect(result.where).toEqual({ id: "staff-1", organisationId: ORG_A });
      });

      it("cannot be tricked into reading/writing another org's record via a spoofed where.organisationId", () => {
        const result = applyOrgScope(
          "StaffMember",
          operation,
          { where: { id: "staff-1", organisationId: ORG_B } },
          ORG_A,
        );
        expect(result.where).toEqual({ id: "staff-1", organisationId: ORG_A });
      });
    },
  );

  it("sets organisationId on create data", () => {
    const result = applyOrgScope(
      "Incident",
      "create",
      { data: { incidentType: "FALL" } },
      ORG_A,
    );
    expect(result.data).toEqual({ incidentType: "FALL", organisationId: ORG_A });
  });

  it("overrides a spoofed organisationId in create data", () => {
    const result = applyOrgScope(
      "Incident",
      "create",
      { data: { incidentType: "FALL", organisationId: ORG_B } },
      ORG_A,
    );
    expect(result.data).toEqual({ incidentType: "FALL", organisationId: ORG_A });
  });

  it("sets organisationId on every row of createMany data", () => {
    const result = applyOrgScope(
      "Notification",
      "createMany",
      { data: [{ title: "a" }, { title: "b", organisationId: ORG_B }] },
      ORG_A,
    );
    expect(result.data).toEqual([
      { title: "a", organisationId: ORG_A },
      { title: "b", organisationId: ORG_A },
    ]);
  });

  it("handles a single non-array createMany data object defensively", () => {
    const result = applyOrgScope(
      "Notification",
      "createMany",
      { data: { title: "a" } },
      ORG_A,
    );
    expect(result.data).toEqual({ title: "a", organisationId: ORG_A });
  });

  it("does not scope operations that aren't in any known op set (e.g. raw queries)", () => {
    const args = { query: "SELECT 1" };
    const result = applyOrgScope("ServiceUser", "queryRaw", args, ORG_A);
    expect(result).toEqual(args);
  });

  // Guards against a model quietly falling out of the allowlist during a
  // schema change — this exact class of bug (VisitSchedule missing from the
  // set) was found and fixed once already this session.
  it("keeps every model known to carry organisationId in the allowlist", () => {
    for (const model of [
      "ServiceUser",
      "StaffMember",
      "Incident",
      "MedicationError",
      "SafeguardingConcern",
      "File",
      "Notification",
      "VisitSchedule",
      "User",
      "OrganisationSubscription",
    ]) {
      expect(ORG_SCOPED_MODELS.has(model)).toBe(true);
    }
  });

  it("does not include InvoiceLine, which has no organisationId column", () => {
    expect(ORG_SCOPED_MODELS.has("InvoiceLine")).toBe(false);
  });

  it("does not include StripeWebhookEvent or SignupAttempt, which have no organisationId column", () => {
    expect(ORG_SCOPED_MODELS.has("StripeWebhookEvent")).toBe(false);
    expect(ORG_SCOPED_MODELS.has("SignupAttempt")).toBe(false);
  });
});

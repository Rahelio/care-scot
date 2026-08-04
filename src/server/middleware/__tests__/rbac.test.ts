import { describe, it, expect } from "vitest";
import type { UserRole } from "@prisma/client";
import { hasPermission } from "../rbac";

// files.ts (staff PVG/DBS/reference/right-to-work documents) is gated on
// these two permissions — a regression here would silently reopen the
// cross-staff document access gap those gates exist to close.
describe("hasPermission — staff.read / staff.manage (files.ts gating)", () => {
  const rolesWithoutStaffRead: UserRole[] = ["CARER", "SENIOR_CARER"];
  const rolesWithStaffRead: UserRole[] = [
    "OFFICE_STAFF",
    "MANAGER",
    "ORG_ADMIN",
    "SUPER_ADMIN",
  ];
  const rolesWithoutStaffManage: UserRole[] = [
    "CARER",
    "SENIOR_CARER",
    "OFFICE_STAFF",
    "READ_ONLY",
  ];
  const rolesWithStaffManage: UserRole[] = ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"];

  it("denies staff.read to carers — a carer must not be able to list or download a colleague's documents", () => {
    for (const role of rolesWithoutStaffRead) {
      expect(hasPermission(role, "staff.read")).toBe(false);
    }
  });

  it("grants staff.read to office staff and above", () => {
    for (const role of rolesWithStaffRead) {
      expect(hasPermission(role, "staff.read")).toBe(true);
    }
  });

  it("denies staff.manage below manager — office staff must not upload/delete staff documents", () => {
    for (const role of rolesWithoutStaffManage) {
      expect(hasPermission(role, "staff.manage")).toBe(false);
    }
  });

  it("grants staff.manage to managers and above", () => {
    for (const role of rolesWithStaffManage) {
      expect(hasPermission(role, "staff.manage")).toBe(true);
    }
  });
});

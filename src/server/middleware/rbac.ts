import type { UserRole } from "@prisma/client";

/** Role hierarchy: higher index = more permissions */
const ROLE_HIERARCHY: UserRole[] = [
  "READ_ONLY",
  "CARER",
  "SENIOR_CARER",
  "OFFICE_STAFF",
  "MANAGER",
  "ORG_ADMIN",
  "SUPER_ADMIN",
];

export function hasRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return (
    ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(minimumRole)
  );
}

/** Map of module → minimum role required */
export const MODULE_PERMISSIONS = {
  clients: {
    read: "CARER" as UserRole,
    write: "SENIOR_CARER" as UserRole,
    admin: "MANAGER" as UserRole,
  },
  staff: {
    read: "OFFICE_STAFF" as UserRole,
    write: "MANAGER" as UserRole,
    admin: "ORG_ADMIN" as UserRole,
  },
  medication: {
    read: "CARER" as UserRole,
    write: "CARER" as UserRole,
    admin: "MANAGER" as UserRole,
  },
  incidents: {
    read: "CARER" as UserRole,
    write: "CARER" as UserRole,
    admin: "MANAGER" as UserRole,
  },
  compliance: {
    read: "OFFICE_STAFF" as UserRole,
    write: "MANAGER" as UserRole,
    admin: "ORG_ADMIN" as UserRole,
  },
} as const;

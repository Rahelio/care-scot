import { TRPCError } from "@trpc/server";
import type { UserRole } from "@prisma/client";
import { t } from "../trpc";
import type { SessionUser } from "./auth";

// ─── Permission strings ────────────────────────────────────────────────────

export type Permission =
  | "care_visits.create"
  | "care_visits.read_own"
  | "care_visits.read_team"
  | "incidents.create"
  | "incidents.read_own"
  | "incidents.manage"
  | "medication.administer"
  | "medication.read"
  | "clients.read"
  | "clients.create"
  | "clients.update"
  | "staff.read"
  | "staff.manage"
  | "complaints.create"
  | "complaints.read"
  | "complaints.manage"
  | "audits.manage"
  | "reports.view_all"
  | "settings.manage"
  | "users.manage";

// ─── Role → permissions map ────────────────────────────────────────────────

const CARER_PERMISSIONS: Permission[] = [
  "care_visits.create",
  "care_visits.read_own",
  "incidents.create",
  "incidents.read_own",
];

const SENIOR_CARER_PERMISSIONS: Permission[] = [
  ...CARER_PERMISSIONS,
  "care_visits.read_team",
  "medication.administer",
  "medication.read",
];

const OFFICE_STAFF_PERMISSIONS: Permission[] = [
  "clients.read",
  "clients.create",
  "clients.update",
  "staff.read",
  "complaints.create",
  "complaints.read",
];

const MANAGER_PERMISSIONS: Permission[] = [
  ...SENIOR_CARER_PERMISSIONS,
  ...OFFICE_STAFF_PERMISSIONS,
  "staff.manage",
  "audits.manage",
  "reports.view_all",
  "incidents.manage",
  "complaints.manage",
];

const ORG_ADMIN_PERMISSIONS: Permission[] = [
  ...MANAGER_PERMISSIONS,
  "settings.manage",
  "users.manage",
];

const ALL_PERMISSIONS: Permission[] = [
  "care_visits.create",
  "care_visits.read_own",
  "care_visits.read_team",
  "incidents.create",
  "incidents.read_own",
  "incidents.manage",
  "medication.administer",
  "medication.read",
  "clients.read",
  "clients.create",
  "clients.update",
  "staff.read",
  "staff.manage",
  "complaints.create",
  "complaints.read",
  "complaints.manage",
  "audits.manage",
  "reports.view_all",
  "settings.manage",
  "users.manage",
];

const READ_ONLY_PERMISSIONS: Permission[] = [
  "care_visits.read_own",
  "incidents.read_own",
  "medication.read",
  "clients.read",
  "staff.read",
  "complaints.read",
  "reports.view_all",
];

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  CARER: CARER_PERMISSIONS,
  SENIOR_CARER: SENIOR_CARER_PERMISSIONS,
  OFFICE_STAFF: OFFICE_STAFF_PERMISSIONS,
  MANAGER: MANAGER_PERMISSIONS,
  ORG_ADMIN: ORG_ADMIN_PERMISSIONS,
  SUPER_ADMIN: ALL_PERMISSIONS,
  READ_ONLY: READ_ONLY_PERMISSIONS,
};

// ─── Public API ────────────────────────────────────────────────────────────

/** Check if a role has a specific permission. */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * tRPC middleware: throws FORBIDDEN if the authenticated user lacks `permission`.
 * Must be used after `protectedProcedure` (which ensures ctx.user is set).
 *
 * @example
 * protectedProcedure.use(requirePermission("clients.read")).query(...)
 */
export function requirePermission(permission: Permission) {
  return t.middleware(({ ctx, next }) => {
    const user = (ctx as unknown as { user: SessionUser }).user;
    if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
    if (!hasPermission(user.role, permission)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Missing permission: ${permission}`,
      });
    }
    return next();
  });
}

/**
 * tRPC middleware: throws FORBIDDEN unless the authenticated user has one of
 * the listed roles. Must be used after `protectedProcedure`.
 *
 * @example
 * protectedProcedure.use(requireRole(["MANAGER", "ORG_ADMIN"])).mutation(...)
 */
export function requireRole(roles: UserRole[]) {
  return t.middleware(({ ctx, next }) => {
    const user = (ctx as unknown as { user: SessionUser }).user;
    if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
    if (!roles.includes(user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Requires one of: ${roles.join(", ")}`,
      });
    }
    return next();
  });
}

// ─── Backward-compat role hierarchy helpers ────────────────────────────────

/** Role hierarchy: higher index = broader permissions */
const ROLE_HIERARCHY: UserRole[] = [
  "READ_ONLY",
  "CARER",
  "SENIOR_CARER",
  "OFFICE_STAFF",
  "MANAGER",
  "ORG_ADMIN",
  "SUPER_ADMIN",
];

/** Returns true if `userRole` is at least `minimumRole` in the hierarchy. */
export function hasRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return (
    ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(minimumRole)
  );
}

/** Minimum role required per module and action level. */
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

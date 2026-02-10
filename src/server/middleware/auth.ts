import { TRPCError } from "@trpc/server";
import type { UserRole } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  organisationId: string;
}

export function requireRole(
  user: SessionUser | null | undefined,
  ...allowedRoles: UserRole[]
) {
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (!allowedRoles.includes(user.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Requires one of: ${allowedRoles.join(", ")}`,
    });
  }
}

export function requireOrgAccess(
  user: SessionUser | null | undefined,
  organisationId: string
) {
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (user.role !== "SUPER_ADMIN" && user.organisationId !== organisationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Access denied to this organisation",
    });
  }
}

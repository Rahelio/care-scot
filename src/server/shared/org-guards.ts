import { TRPCError } from "@trpc/server";
import type { OrgScopedPrismaClient } from "../middleware/org-scope";

/**
 * Confirms serviceUserId resolves to a real client in the caller's own org
 * before creating a record that references it. ctx.db's org-scoping alone
 * only guarantees the NEW row gets the caller's own organisationId — it
 * doesn't stop serviceUserId itself from pointing at a client belonging to
 * a different org, which would create a row that's correctly-orged but
 * dangles off someone else's client. Every mutation that creates a
 * sub-record from a raw serviceUserId input must call this first.
 */
export async function assertServiceUserInOrg(
  db: OrgScopedPrismaClient,
  serviceUserId: string,
): Promise<void> {
  const exists = await db.serviceUser.findUnique({
    where: { id: serviceUserId },
    select: { id: true },
  });
  if (!exists) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Service user not found." });
  }
}

/** Same guard as assertServiceUserInOrg, for raw staffMemberId inputs. */
export async function assertStaffMemberInOrg(
  db: OrgScopedPrismaClient,
  staffMemberId: string,
): Promise<void> {
  const exists = await db.staffMember.findUnique({
    where: { id: staffMemberId },
    select: { id: true },
  });
  if (!exists) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Staff member not found." });
  }
}

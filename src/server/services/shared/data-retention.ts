import type { Prisma, PrismaClient } from "@prisma/client";
import { createAuditLog } from "../../middleware/audit";

// Retention period after discharge/departure, per organisation policy
// decision — after this many years, a DISCHARGED ServiceUser or LEFT
// StaffMember is anonymised (not hard-deleted), matching the existing
// manual GDPR erasure pattern (clients.ts's eraseData) so that linked
// records Care Inspectorate regulations require retaining (incidents,
// medication history, audit trail) stay intact without pointing to
// identifiable personal details.
export const RETENTION_YEARS = 6;

/** Marker used to detect an already-anonymised row so a re-run doesn't reprocess it. */
const ANONYMISED_LAST_NAME = "Data Subject";

function cutoffDate(now: Date = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS);
  return cutoff;
}

/**
 * The identifying-field reset used for both the manual GDPR erasure
 * mutation (clients.ts eraseData) and the automated retention purge below —
 * single source of truth so the two paths can't drift apart on which fields
 * count as "identifying".
 */
export function anonymisedServiceUserData(): Prisma.ServiceUserUpdateInput {
  return {
    firstName: "Erased",
    lastName: ANONYMISED_LAST_NAME,
    chiNumber: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    postcode: null,
    phonePrimary: null,
    phoneSecondary: null,
    email: null,
    niNumber: null,
    gpName: null,
    gpPractice: null,
    gpPhone: null,
    communicationNeeds: null,
    culturalReligiousNeeds: null,
    dietaryRequirements: null,
    dailyRoutinePreferences: null,
    advanceCarePlan: null,
    dischargeReason: null,
  };
}

/** Same idea as anonymisedServiceUserData(), for a departed StaffMember. */
export function anonymisedStaffMemberData(): Prisma.StaffMemberUpdateInput {
  return {
    firstName: "Erased",
    lastName: ANONYMISED_LAST_NAME,
    dateOfBirth: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    postcode: null,
    phone: null,
    email: null,
    niNumber: null,
    rightToWorkDocument: null,
  };
}

export interface PurgeResult {
  serviceUsersAnonymised: number;
  staffMembersAnonymised: number;
}

/**
 * Anonymises ServiceUser/StaffMember records past the retention period for
 * one organisation. Called from the /api/cron/purge-expired-records route
 * (system-triggered, no authenticated session) — writes go through the base
 * Prisma client directly rather than ctx.db, so each anonymisation is
 * explicitly audit-logged here (mirroring how auth.ts's password-reset flow
 * logs credential changes that also happen outside a session).
 */
export async function purgeExpiredRecords(
  prisma: PrismaClient,
  organisationId: string,
): Promise<PurgeResult> {
  const cutoff = cutoffDate();

  const [expiredServiceUsers, expiredStaffMembers] = await Promise.all([
    prisma.serviceUser.findMany({
      where: {
        organisationId,
        status: "DISCHARGED",
        dischargeDate: { lte: cutoff },
        NOT: { lastName: ANONYMISED_LAST_NAME },
      },
      select: { id: true },
    }),
    prisma.staffMember.findMany({
      where: {
        organisationId,
        status: "LEFT",
        endDate: { lte: cutoff },
        NOT: { lastName: ANONYMISED_LAST_NAME },
      },
      select: { id: true },
    }),
  ]);

  for (const { id } of expiredServiceUsers) {
    await prisma.serviceUser.update({ where: { id }, data: anonymisedServiceUserData() });
    await createAuditLog({
      organisationId,
      entityType: "ServiceUser",
      entityId: id,
      action: "UPDATE",
      changes: { retentionPurge: { to: `Anonymised — ${RETENTION_YEARS}-year post-discharge retention period elapsed` } },
    }).catch((err) => {
      console.error("[data-retention] Failed to log ServiceUser purge:", err);
    });
  }

  for (const { id } of expiredStaffMembers) {
    await prisma.staffMember.update({ where: { id }, data: anonymisedStaffMemberData() });
    await createAuditLog({
      organisationId,
      entityType: "StaffMember",
      entityId: id,
      action: "UPDATE",
      changes: { retentionPurge: { to: `Anonymised — ${RETENTION_YEARS}-year post-departure retention period elapsed` } },
    }).catch((err) => {
      console.error("[data-retention] Failed to log StaffMember purge:", err);
    });
  }

  return {
    serviceUsersAnonymised: expiredServiceUsers.length,
    staffMembersAnonymised: expiredStaffMembers.length,
  };
}

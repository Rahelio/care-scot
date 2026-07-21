import { prisma } from "@/lib/prisma";

/**
 * Prisma model names (PascalCase) that carry an `organisationId` column.
 * Models without it (Organisation, PolicyAcknowledgment, RotaAvailability,
 * Account, Session, VerificationToken) are passed through untouched.
 */
const ORG_SCOPED_MODELS = new Set([
  "ServiceUser",
  "ServiceUserContact",
  "ServiceUserHealthcareProfessional",
  "PersonalPlan",
  "RiskAssessment",
  "ConsentRecord",
  "ServiceAgreement",
  "HealthRecord",
  "CareVisitRecord",
  "ServiceUserReview",
  "StaffMember",
  "StaffPvgRecord",
  "StaffRegistration",
  "StaffReference",
  "StaffHealthDeclaration",
  "StaffInduction",
  "StaffTrainingRecord",
  "StaffSupervision",
  "StaffAppraisal",
  "StaffDisciplinaryRecord",
  "StaffAbsenceRecord",
  "StaffLeaving",
  "ServiceUserMedication",
  "MedicationAdminRecord",
  "MedicationError",
  "MedicationAudit",
  "Incident",
  "SafeguardingConcern",
  "CareInspectorateNotification",
  "Policy",
  "Complaint",
  "Compliment",
  "QualityAudit",
  "CareInspectorateInspection",
  "EquipmentCheck",
  "SatisfactionSurvey",
  "AnnualReturn",
  "File",
  "RotaShift",
  "AuditLog",
  "User",
  "Funder",
  "RateCard",
  "RateCardLine",
  "MileageRate",
  "CarePackage",
  "BillableVisit",
  "BankHoliday",
  "Invoice",
  "InvoiceLine",
  "CreditNote",
]);

/**
 * Operations where we safely append `{ organisationId }` to `where`.
 * Includes updateMany/deleteMany — these operate on sets of rows.
 */
const SCOPED_WHERE_OPS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

/**
 * Single-record mutation/lookup operations that rely on a unique key in `where`.
 * Prisma supports filtering a unique query by additional non-unique fields
 * (stable since v4.16), so `organisationId` can be safely appended alongside
 * the unique key without corrupting the lookup — it just narrows it. A row
 * belonging to another organisation now behaves exactly like a nonexistent
 * one (`P2025`/`RecordNotFound`) instead of being reachable across tenants.
 */
const UNIQUE_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "update",
  "delete",
  "upsert",
]);

type AnyArgs = Record<string, unknown>;

/**
 * Returns an org-scoped Prisma client that:
 *  - Auto-adds `{ organisationId }` to `where` on all list/count/many-write ops
 *  - Auto-sets `data.organisationId` on create / createMany
 *  - Auto-appends `organisationId` to `where` on single-record ops (findUnique,
 *    update, delete, upsert), so cross-org access fails as a not-found rather
 *    than succeeding
 *
 * Use via `ctx.db` in every `protectedProcedure`. The base `ctx.prisma` remains
 * available for super-admin cross-org operations.
 */
export function createOrgScopedPrisma(organisationId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: {
          model: string;
          operation: string;
          args: AnyArgs;
          query: (args: AnyArgs) => Promise<unknown>;
        }) {
          if (!ORG_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          // ── List / count / many-write ops: inject into where ──────────────
          if (SCOPED_WHERE_OPS.has(operation)) {
            args = {
              ...args,
              where: { ...(args.where as AnyArgs | undefined), organisationId },
            };
          }

          // ── Create: inject into data ───────────────────────────────────────
          if (operation === "create") {
            args = {
              ...args,
              data: { ...(args.data as AnyArgs | undefined), organisationId },
            };
          }

          if (operation === "createMany") {
            const data = args.data;
            args = {
              ...args,
              data: Array.isArray(data)
                ? data.map((row: AnyArgs) => ({ ...row, organisationId }))
                : { ...(data as AnyArgs), organisationId },
            };
          }

          // ── Single-record ops: append organisationId to the where clause ───
          // Narrows the unique-key lookup rather than replacing it, so a
          // record belonging to another org simply isn't found (P2025)
          // instead of being readable/writable across tenants.
          if (UNIQUE_OPS.has(operation)) {
            args = {
              ...args,
              where: { ...(args.where as AnyArgs | undefined), organisationId },
            };
          }

          return query(args);
        },
      },
    },
  });
}

export type OrgScopedPrismaClient = ReturnType<typeof createOrgScopedPrisma>;

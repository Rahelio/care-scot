import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { DayOfWeek, Prisma } from "@prisma/client";
import { requirePermission } from "../middleware/rbac";
import { assertServiceUserInOrg, assertStaffMemberInOrg } from "../shared/org-guards";
import type { OrgScopedPrismaClient } from "../middleware/org-scope";

const rotaReadProcedure = protectedProcedure.use(requirePermission("rota.read"));
const rotaManageProcedure = protectedProcedure.use(requirePermission("rota.manage"));

// Date.getDay()/getUTCDay() index (0 = Sunday .. 6 = Saturday) mapped onto the
// DayOfWeek enum, which is declared MONDAY-first. RotaVisit.visitDate is a
// @db.Date column — Prisma returns these as UTC-midnight Date objects, so
// getUTCDay() (not getDay()) avoids a local-timezone off-by-one around
// DST transitions.
const DAY_OF_WEEK_BY_JS_DAY: DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

interface ConflictDetail {
  type: "LEAVE" | "DOUBLE_BOOKED" | "OUTSIDE_AVAILABILITY";
  message: string;
  [key: string]: unknown;
}

interface ConflictContext {
  absences: { staffMemberId: string; startDate: Date; endDate: Date | null; absenceType: string; approvedBy: string | null }[];
  assignments: { staffMemberId: string; rotaVisit: { id: string; visitDate: Date; startTime: string; endTime: string } }[];
  availability: { staffMemberId: string; dayOfWeek: DayOfWeek; availableFrom: string; availableTo: string; isAvailable: boolean; effectiveFrom: Date; effectiveTo: Date | null }[];
}

/**
 * Batch-fetches everything needed to conflict-check any number of
 * staff/visit pairs within a date range in ONE round of queries, instead of
 * re-querying per staff member per visit — the latter multiplies badly once
 * checking "is everyone available for this visit" against a large roster.
 */
async function fetchConflictContext(
  db: OrgScopedPrismaClient,
  params: { staffMemberIds: string[]; minDate: Date; maxDate: Date },
): Promise<ConflictContext> {
  const [absences, assignments, availability] = await Promise.all([
    db.staffAbsenceRecord.findMany({
      where: {
        staffMemberId: { in: params.staffMemberIds },
        startDate: { lte: params.maxDate },
        OR: [{ endDate: null }, { endDate: { gte: params.minDate } }],
      },
    }),
    db.rotaVisitAssignment.findMany({
      where: {
        staffMemberId: { in: params.staffMemberIds },
        rotaVisit: { visitDate: { gte: params.minDate, lte: params.maxDate }, status: { not: "CANCELLED" } },
      },
      include: { rotaVisit: { select: { id: true, visitDate: true, startTime: true, endTime: true } } },
    }),
    db.rotaAvailability.findMany({
      where: {
        staffMemberId: { in: params.staffMemberIds },
        effectiveFrom: { lte: params.maxDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: params.minDate } }],
      },
    }),
  ]);
  return { absences, assignments, availability };
}

/**
 * A client can only be in one place at a time. Two carers attending the
 * same visit together (a double-up, or a trainee shadowing) is represented
 * by carersRequired on a single RotaVisit, never by two separate
 * overlapping visit rows for the same client — so unlike staff conflicts
 * (advisory, since covering an emergency sometimes means accepting a clash),
 * this is a hard data-integrity rule with no override.
 */
async function assertNoOverlappingClientVisit(
  db: OrgScopedPrismaClient,
  params: { serviceUserId: string; visitDate: Date; startTime: string; endTime: string },
  excludeVisitId?: string,
): Promise<void> {
  const sameDayVisits = await db.rotaVisit.findMany({
    where: {
      serviceUserId: params.serviceUserId,
      visitDate: params.visitDate,
      status: { not: "CANCELLED" },
      ...(excludeVisitId ? { id: { not: excludeVisitId } } : {}),
    },
    select: { startTime: true, endTime: true },
  });
  const conflict = sameDayVisits.find((v) => params.startTime < v.endTime && v.startTime < params.endTime);
  if (conflict) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `This client already has a visit ${conflict.startTime}–${conflict.endTime} that day. If two carers need to attend together, set "carers required" to 2 on one visit instead of creating a second one.`,
    });
  }
}

/**
 * Pure, in-memory conflict check against an already-fetched context. Per
 * product decision, conflicts are advisory only — callers decide whether to
 * block or let the admin override, this just reports what it finds.
 */
function computeConflicts(
  context: ConflictContext,
  params: { staffMemberId: string; visitDate: Date; startTime: string; endTime: string },
  excludeVisitId?: string,
): ConflictDetail[] {
  const conflicts: ConflictDetail[] = [];

  for (const absence of context.absences) {
    if (absence.staffMemberId !== params.staffMemberId) continue;
    if (absence.startDate <= params.visitDate && (!absence.endDate || absence.endDate >= params.visitDate)) {
      conflicts.push({
        type: "LEAVE",
        message: `On ${absence.absenceType.toLowerCase()} leave${absence.approvedBy ? "" : " (pending approval)"}`,
        absenceType: absence.absenceType,
      });
    }
  }

  for (const assignment of context.assignments) {
    if (assignment.staffMemberId !== params.staffMemberId) continue;
    if (excludeVisitId && assignment.rotaVisit.id === excludeVisitId) continue;
    if (assignment.rotaVisit.visitDate.getTime() !== params.visitDate.getTime()) continue;
    const { startTime: otherStart, endTime: otherEnd } = assignment.rotaVisit;
    const overlaps = params.startTime < otherEnd && otherStart < params.endTime;
    if (overlaps) {
      conflicts.push({
        type: "DOUBLE_BOOKED",
        message: `Already assigned to another visit ${otherStart}–${otherEnd} that day`,
        rotaVisitId: assignment.rotaVisit.id,
      });
    }
  }

  const dayOfWeek = DAY_OF_WEEK_BY_JS_DAY[params.visitDate.getUTCDay()];
  const withinAvailability = context.availability.some(
    (a) =>
      a.staffMemberId === params.staffMemberId &&
      a.dayOfWeek === dayOfWeek &&
      a.effectiveFrom <= params.visitDate &&
      (!a.effectiveTo || a.effectiveTo >= params.visitDate) &&
      a.isAvailable &&
      a.availableFrom <= params.startTime &&
      params.endTime <= a.availableTo,
  );
  if (!withinAvailability) {
    conflicts.push({
      type: "OUTSIDE_AVAILABILITY",
      message: "No matching availability window recorded for this staff member",
    });
  }

  return conflicts;
}

/** Single staff/visit conflict check — fetches context for just this one pair. */
async function detectConflicts(
  db: OrgScopedPrismaClient,
  params: { staffMemberId: string; visitDate: Date; startTime: string; endTime: string },
  excludeVisitId?: string,
): Promise<ConflictDetail[]> {
  const context = await fetchConflictContext(db, {
    staffMemberIds: [params.staffMemberId],
    minDate: params.visitDate,
    maxDate: params.visitDate,
  });
  return computeConflicts(context, params, excludeVisitId);
}

/** Recomputes RotaVisit.status from its assignment count vs carersRequired. */
async function recomputeVisitStatus(db: OrgScopedPrismaClient, rotaVisitId: string): Promise<void> {
  const visit = await db.rotaVisit.findUniqueOrThrow({
    where: { id: rotaVisitId },
    select: { status: true, carersRequired: true, _count: { select: { assignments: true } } },
  });
  if (visit.status === "CANCELLED") return;

  const count = visit._count.assignments;
  const status = count === 0 ? "UNASSIGNED" : count < visit.carersRequired ? "PARTIALLY_ASSIGNED" : "ASSIGNED";
  if (status !== visit.status) {
    await db.rotaVisit.update({ where: { id: rotaVisitId }, data: { status } });
  }
}

function minutesBetween(v: { startTime: string; endTime: string }): number {
  const [sh, sm] = v.startTime.split(":").map(Number);
  const [eh, em] = v.endTime.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

/**
 * A Serializable-isolation write conflict — Postgres aborted this side of
 * two concurrent transactions that read/wrote overlapping data (SQLSTATE
 * 40001) — must be treated as "conflict found", not a generic 500.
 *
 * Checked by duck-typing rather than `instanceof Prisma.PrismaClientKnownRequestError`
 * with code "P2034": verified live against this project's actual driver-adapter
 * setup (@prisma/adapter-pg) that a write conflict surfaces as a raw
 * `DriverAdapterError` (name === "DriverAdapterError", cause.kind ===
 * "TransactionWriteConflict") rather than the wrapped P2034 error the binary
 * query engine produces — the two shapes are different, and only checking
 * for P2034 silently failed to catch this in practice. Checking both keeps
 * this robust if the underlying adapter/engine setup changes.
 */
export function isSerializationFailure(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") return true;
  if (
    e instanceof Error &&
    e.name === "DriverAdapterError" &&
    typeof (e as { cause?: unknown }).cause === "object" &&
    (e as { cause?: { kind?: unknown } }).cause !== null &&
    (e as { cause?: { kind?: unknown } }).cause?.kind === "TransactionWriteConflict"
  ) {
    return true;
  }
  return false;
}

type AssignmentAttempt =
  | { status: "created"; conflicts: ConflictDetail[] }
  | { status: "already_assigned"; conflicts: ConflictDetail[] }
  | { status: "double_booked"; conflicts: ConflictDetail[] }
  | { status: "soft_conflict_blocked"; conflicts: ConflictDetail[] };

/**
 * Creates a single rota visit assignment, re-checking conflicts against
 * fresh data inside a Serializable transaction immediately before writing.
 *
 * Without this, both `assign` and `autoAssign` read conflict state, decided
 * there was none, and only then wrote the assignment — with no locking in
 * between. Two concurrent calls (two managers auto-assigning overlapping
 * visit sets, or auto-assign racing a manual assign) could both read
 * "unassigned" and independently pick the same staff member for overlapping
 * visits, double-booking them despite this exact check existing to prevent
 * that. Serializable isolation makes Postgres detect the conflicting
 * concurrent read-write and abort one side with a P2034 error rather than
 * silently letting both writes through.
 *
 * `allowSoftConflictOverride` controls whether a non-DOUBLE_BOOKED conflict
 * (LEAVE/OUTSIDE_AVAILABILITY) blocks the write or is recorded as an
 * accepted override — DOUBLE_BOOKED is never overridable either way.
 */
export async function tryCreateAssignment(
  db: OrgScopedPrismaClient,
  params: {
    rotaVisitId: string;
    staffMemberId: string;
    visitDate: Date;
    startTime: string;
    endTime: string;
    assignedBy: string;
    organisationId: string;
    allowSoftConflictOverride: boolean;
  },
): Promise<AssignmentAttempt> {
  try {
    return await db.$transaction(
      async (tx) => {
        const conflicts = await detectConflicts(
          tx as unknown as OrgScopedPrismaClient,
          {
            staffMemberId: params.staffMemberId,
            visitDate: params.visitDate,
            startTime: params.startTime,
            endTime: params.endTime,
          },
          params.rotaVisitId,
        );

        if (conflicts.some((c) => c.type === "DOUBLE_BOOKED")) {
          return { status: "double_booked" as const, conflicts };
        }
        if (conflicts.length > 0 && !params.allowSoftConflictOverride) {
          return { status: "soft_conflict_blocked" as const, conflicts };
        }

        const existing = await tx.rotaVisitAssignment.findUnique({
          where: {
            rotaVisitId_staffMemberId: {
              rotaVisitId: params.rotaVisitId,
              staffMemberId: params.staffMemberId,
            },
          },
        });
        if (existing) {
          return { status: "already_assigned" as const, conflicts };
        }

        await tx.rotaVisitAssignment.create({
          data: {
            rotaVisitId: params.rotaVisitId,
            staffMemberId: params.staffMemberId,
            organisationId: params.organisationId,
            hasConflictOverride: conflicts.length > 0,
            conflictDetails: conflicts.length > 0 ? conflicts : undefined,
            assignedBy: params.assignedBy,
          },
        });
        await recomputeVisitStatus(tx as unknown as OrgScopedPrismaClient, params.rotaVisitId);

        return { status: "created" as const, conflicts };
      },
      { isolationLevel: "Serializable" },
    );
  } catch (e) {
    if (isSerializationFailure(e)) {
      // Lost the race — someone else committed a conflicting assignment for
      // this staff member between our read and our write. Report it the
      // same way an in-transaction DOUBLE_BOOKED detection would, so both
      // callers handle it identically without needing to know about P2034.
      return {
        status: "double_booked",
        conflicts: [
          {
            type: "DOUBLE_BOOKED",
            message: "Assignment conflicted with a concurrent change — please retry.",
          },
        ],
      };
    }
    throw e;
  }
}

export const rotaRouter = router({
  // ── Availability ──────────────────────────
  availability: router({
    getByStaff: rotaReadProcedure
      .input(z.object({ staffMemberId: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        return ctx.db.rotaAvailability.findMany({
          where: { staffMemberId: input.staffMemberId },
          orderBy: [{ dayOfWeek: "asc" }, { availableFrom: "asc" }],
        });
      }),

    create: rotaManageProcedure
      .input(
        z.object({
          staffMemberId: z.string().min(1),
          dayOfWeek: z.nativeEnum(DayOfWeek),
          availableFrom: z.string().min(1),
          availableTo: z.string().min(1),
          isAvailable: z.boolean().optional(),
          effectiveFrom: z.date(),
          effectiveTo: z.date().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await assertStaffMemberInOrg(ctx.db, input.staffMemberId);
        return ctx.db.rotaAvailability.create({
          data: { ...input, organisationId: ctx.user.organisationId },
        });
      }),

    update: rotaManageProcedure
      .input(
        z.object({
          id: z.string().min(1),
          dayOfWeek: z.nativeEnum(DayOfWeek).optional(),
          availableFrom: z.string().min(1).optional(),
          availableTo: z.string().min(1).optional(),
          isAvailable: z.boolean().optional(),
          effectiveFrom: z.date().optional(),
          effectiveTo: z.date().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const record = await ctx.prisma.rotaAvailability.findUniqueOrThrow({
          where: { id },
          select: { organisationId: true },
        });
        if (record.organisationId !== ctx.user.organisationId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return ctx.db.rotaAvailability.update({ where: { id }, data });
      }),

    delete: rotaManageProcedure
      .input(z.object({ id: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const record = await ctx.prisma.rotaAvailability.findUniqueOrThrow({
          where: { id: input.id },
          select: { organisationId: true },
        });
        if (record.organisationId !== ctx.user.organisationId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return ctx.db.rotaAvailability.delete({ where: { id: input.id } });
      }),
  }),

  // ── Leave ──────────────────────────────────
  // Read-only wrapper over StaffAbsenceRecord for rota display. Writes stay
  // in staff.absence.* — this never creates/edits absence records itself.
  leave: router({
    getForRange: rotaReadProcedure
      .input(z.object({ from: z.date(), to: z.date() }))
      .query(async ({ ctx, input }) => {
        return ctx.db.staffAbsenceRecord.findMany({
          where: {
            startDate: { lte: input.to },
            OR: [{ endDate: null }, { endDate: { gte: input.from } }],
          },
          include: {
            staffMember: { select: { id: true, firstName: true, lastName: true } },
          },
        });
      }),
  }),

  // ── Care visits ────────────────────────────
  visits: router({
    listByServiceUser: rotaReadProcedure
      .input(z.object({ serviceUserId: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        return ctx.db.rotaVisit.findMany({
          where: { serviceUserId: input.serviceUserId },
          orderBy: [{ visitDate: "asc" }, { startTime: "asc" }],
          include: {
            assignments: {
              include: { staffMember: { select: { id: true, firstName: true, lastName: true } } },
            },
          },
        });
      }),

    create: rotaManageProcedure
      .input(
        z.object({
          serviceUserId: z.string().min(1),
          visitDate: z.date(),
          startTime: z.string().min(1),
          endTime: z.string().min(1),
          carersRequired: z.number().int().min(1).optional(),
          notes: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await assertServiceUserInOrg(ctx.db, input.serviceUserId);
        await assertNoOverlappingClientVisit(ctx.db, input);
        return ctx.db.rotaVisit.create({
          data: {
            ...input,
            organisationId: ctx.user.organisationId,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          },
        });
      }),

    /**
     * Generates one visit per matching date in [rangeStart, rangeEnd] —
     * a one-off convenience, not a persisted recurring template. Safely
     * re-runnable: dates where the client already has an overlapping visit
     * are skipped, not duplicated or double-booked. Individual creates (not
     * createMany) so every row still goes through audit logging, matching
     * this file's other bulk writes.
     */
    createRecurring: rotaManageProcedure
      .input(
        z.object({
          serviceUserId: z.string().min(1),
          daysOfWeek: z.array(z.nativeEnum(DayOfWeek)).min(1),
          startTime: z.string().min(1),
          endTime: z.string().min(1),
          carersRequired: z.number().int().min(1).optional(),
          notes: z.string().optional(),
          rangeStart: z.date(),
          rangeEnd: z.date(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await assertServiceUserInOrg(ctx.db, input.serviceUserId);

        const days = new Set(input.daysOfWeek);
        const candidateDates: Date[] = [];
        for (
          let d = new Date(input.rangeStart);
          d.getTime() <= input.rangeEnd.getTime();
          d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
        ) {
          if (days.has(DAY_OF_WEEK_BY_JS_DAY[d.getUTCDay()])) candidateDates.push(new Date(d));
        }
        if (candidateDates.length === 0) {
          return { createdCount: 0, skippedCount: 0 };
        }

        // Skip any date where the client already has an overlapping
        // non-cancelled visit — not just an exact time match — so this can
        // never manufacture the same double-booking a single create() call
        // would reject (see assertNoOverlappingClientVisit).
        const existing = await ctx.db.rotaVisit.findMany({
          where: {
            serviceUserId: input.serviceUserId,
            visitDate: { in: candidateDates },
            status: { not: "CANCELLED" },
          },
          select: { visitDate: true, startTime: true, endTime: true },
        });
        const existingByDate = new Map<number, { startTime: string; endTime: string }[]>();
        for (const v of existing) {
          const key = v.visitDate.getTime();
          existingByDate.set(key, [...(existingByDate.get(key) ?? []), v]);
        }
        const toCreate = candidateDates.filter((d) => {
          const dayExisting = existingByDate.get(d.getTime()) ?? [];
          return !dayExisting.some((v) => input.startTime < v.endTime && v.startTime < input.endTime);
        });

        for (const visitDate of toCreate) {
          await ctx.db.rotaVisit.create({
            data: {
              serviceUserId: input.serviceUserId,
              organisationId: ctx.user.organisationId,
              visitDate,
              startTime: input.startTime,
              endTime: input.endTime,
              carersRequired: input.carersRequired ?? 1,
              notes: input.notes,
              createdBy: ctx.user.id,
              updatedBy: ctx.user.id,
            },
          });
        }

        return { createdCount: toCreate.length, skippedCount: candidateDates.length - toCreate.length };
      }),

    update: rotaManageProcedure
      .input(
        z.object({
          id: z.string().min(1),
          visitDate: z.date().optional(),
          startTime: z.string().min(1).optional(),
          endTime: z.string().min(1).optional(),
          carersRequired: z.number().int().min(1).optional(),
          notes: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const record = await ctx.prisma.rotaVisit.findUniqueOrThrow({
          where: { id },
          select: { organisationId: true, serviceUserId: true, visitDate: true, startTime: true, endTime: true },
        });
        if (record.organisationId !== ctx.user.organisationId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await assertNoOverlappingClientVisit(
          ctx.db,
          {
            serviceUserId: record.serviceUserId,
            visitDate: data.visitDate ?? record.visitDate,
            startTime: data.startTime ?? record.startTime,
            endTime: data.endTime ?? record.endTime,
          },
          id,
        );
        const updated = await ctx.db.rotaVisit.update({
          where: { id },
          data: { ...data, updatedBy: ctx.user.id },
        });
        await recomputeVisitStatus(ctx.db, id);
        return updated;
      }),

    cancel: rotaManageProcedure
      .input(z.object({ id: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const record = await ctx.prisma.rotaVisit.findUniqueOrThrow({
          where: { id: input.id },
          select: { organisationId: true },
        });
        if (record.organisationId !== ctx.user.organisationId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return ctx.db.rotaVisit.update({
          where: { id: input.id },
          data: { status: "CANCELLED", updatedBy: ctx.user.id },
        });
      }),

    delete: rotaManageProcedure
      .input(z.object({ id: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const record = await ctx.prisma.rotaVisit.findUniqueOrThrow({
          where: { id: input.id },
          select: {
            organisationId: true,
            _count: { select: { assignments: true, careVisitRecords: true } },
          },
        });
        if (record.organisationId !== ctx.user.organisationId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (record._count.assignments > 0 || record._count.careVisitRecords > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot delete a visit with staff assigned or linked care records. Unassign staff or cancel it instead.",
          });
        }
        return ctx.db.rotaVisit.delete({ where: { id: input.id } });
      }),
  }),

  // ── Staff assignment ───────────────────────
  assignments: router({
    assign: rotaManageProcedure
      .input(
        z.object({
          rotaVisitId: z.string().min(1),
          staffMemberId: z.string().min(1),
          overrideConflict: z.boolean().default(false),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const visit = await ctx.db.rotaVisit.findUniqueOrThrow({
          where: { id: input.rotaVisitId },
          select: { visitDate: true, startTime: true, endTime: true },
        });
        await assertStaffMemberInOrg(ctx.db, input.staffMemberId);

        // A staff member can't physically attend two overlapping visits —
        // unlike LEAVE/OUTSIDE_AVAILABILITY (which an admin might reasonably
        // override for emergency cover), DOUBLE_BOOKED is never overridable.
        const result = await tryCreateAssignment(ctx.db, {
          rotaVisitId: input.rotaVisitId,
          staffMemberId: input.staffMemberId,
          visitDate: visit.visitDate,
          startTime: visit.startTime,
          endTime: visit.endTime,
          assignedBy: ctx.user.id,
          organisationId: ctx.user.organisationId,
          allowSoftConflictOverride: input.overrideConflict,
        });

        if (result.status === "double_booked") {
          return { applied: false as const, conflicts: result.conflicts, hardBlocked: true as const };
        }
        if (result.status === "soft_conflict_blocked") {
          return { applied: false as const, conflicts: result.conflicts, hardBlocked: false as const };
        }
        return { applied: true as const, conflicts: result.conflicts };
      }),

    unassign: rotaManageProcedure
      .input(z.object({ rotaVisitId: z.string().min(1), staffMemberId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const existing = await ctx.db.rotaVisitAssignment.findUnique({
          where: {
            rotaVisitId_staffMemberId: {
              rotaVisitId: input.rotaVisitId,
              staffMemberId: input.staffMemberId,
            },
          },
        });
        if (existing) {
          await ctx.db.rotaVisitAssignment.delete({ where: { id: existing.id } });
          await recomputeVisitStatus(ctx.db, input.rotaVisitId);
        }
        return { ok: true };
      }),

    bulkAssign: rotaManageProcedure
      .input(
        z.object({
          rotaVisitIds: z.array(z.string().min(1)).min(1),
          staffMemberIds: z.array(z.string().min(1)).min(1),
          overrideConflict: z.boolean().default(false),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const visits = await ctx.db.rotaVisit.findMany({
          where: { id: { in: input.rotaVisitIds } },
          select: { id: true, visitDate: true, startTime: true, endTime: true },
        });
        for (const staffMemberId of input.staffMemberIds) {
          await assertStaffMemberInOrg(ctx.db, staffMemberId);
        }

        const visitDates = visits.map((v) => v.visitDate.getTime());
        const context = await fetchConflictContext(ctx.db, {
          staffMemberIds: input.staffMemberIds,
          minDate: new Date(Math.min(...visitDates)),
          maxDate: new Date(Math.max(...visitDates)),
        });
        const pairConflicts: { rotaVisitId: string; staffMemberId: string; conflicts: ConflictDetail[] }[] = [];
        for (const visit of visits) {
          for (const staffMemberId of input.staffMemberIds) {
            const conflicts = computeConflicts(context, { staffMemberId, ...visit }, visit.id);
            if (conflicts.length > 0) {
              pairConflicts.push({ rotaVisitId: visit.id, staffMemberId, conflicts });
            }
          }
        }

        // Same rule as assign(): a DOUBLE_BOOKED conflict anywhere in the
        // batch blocks the whole batch, with no override — a person can't
        // physically attend two overlapping visits, unlike LEAVE/
        // OUTSIDE_AVAILABILITY which an admin might reasonably accept.
        if (pairConflicts.some((c) => c.conflicts.some((x) => x.type === "DOUBLE_BOOKED"))) {
          return { applied: false as const, conflicts: pairConflicts, hardBlocked: true as const };
        }
        if (pairConflicts.length > 0 && !input.overrideConflict) {
          return { applied: false as const, conflicts: pairConflicts, hardBlocked: false as const };
        }

        const affectedVisitIds = new Set<string>();
        for (const visit of visits) {
          for (const staffMemberId of input.staffMemberIds) {
            const existing = await ctx.db.rotaVisitAssignment.findUnique({
              where: { rotaVisitId_staffMemberId: { rotaVisitId: visit.id, staffMemberId } },
            });
            if (existing) continue;
            const conflicts = pairConflicts.find(
              (c) => c.rotaVisitId === visit.id && c.staffMemberId === staffMemberId,
            )?.conflicts;
            await ctx.db.rotaVisitAssignment.create({
              data: {
                rotaVisitId: visit.id,
                staffMemberId,
                organisationId: ctx.user.organisationId,
                hasConflictOverride: Boolean(conflicts?.length),
                conflictDetails: conflicts?.length ? conflicts : undefined,
                assignedBy: ctx.user.id,
              },
            });
            affectedVisitIds.add(visit.id);
          }
        }
        for (const id of affectedVisitIds) {
          await recomputeVisitStatus(ctx.db, id);
        }

        return { applied: true as const, conflicts: pairConflicts };
      }),

    /**
     * Read-only preview for the assign-staff dialog: for every active staff
     * member, reports any conflicts they'd have against the given visit(s)
     * — the exact same check `assign`/`bulkAssign` run on submit, so the
     * preview and the real outcome never disagree. Lets the picker show a
     * warning before the admin commits to a choice, not just after.
     */
    checkAvailability: rotaReadProcedure
      .input(z.object({ rotaVisitIds: z.array(z.string().min(1)).min(1) }))
      .query(async ({ ctx, input }) => {
        const visits = await ctx.db.rotaVisit.findMany({
          where: { id: { in: input.rotaVisitIds } },
          select: { id: true, visitDate: true, startTime: true, endTime: true },
        });
        if (visits.length === 0) return [];

        const staffMembers = await ctx.db.staffMember.findMany({
          where: { status: "ACTIVE" },
          select: { id: true },
        });
        const visitDates = visits.map((v) => v.visitDate.getTime());
        const context = await fetchConflictContext(ctx.db, {
          staffMemberIds: staffMembers.map((s) => s.id),
          minDate: new Date(Math.min(...visitDates)),
          maxDate: new Date(Math.max(...visitDates)),
        });

        return staffMembers.map((member) => ({
          staffMemberId: member.id,
          conflicts: visits.flatMap((visit) =>
            computeConflicts(context, { staffMemberId: member.id, ...visit }, visit.id),
          ),
        }));
      }),

    /**
     * Fills as many of the given visits' remaining carer slots as possible.
     * Never auto-forces a LEAVE or DOUBLE_BOOKED conflict — those are left
     * unassigned and reported, not overridden — appropriate for a care
     * compliance context. An OUTSIDE_AVAILABILITY-only conflict may be used
     * if nothing conflict-free exists. Candidates are ranked by: fewest
     * conflicts first (never prefer a same-area candidate with an avoidable
     * conflict over a conflict-free one elsewhere), then same area as the
     * client, then least total assigned minutes so far today (load-balancing).
     */
    autoAssign: rotaManageProcedure
      .input(z.object({ rotaVisitIds: z.array(z.string().min(1)).min(1) }))
      .mutation(async ({ ctx, input }) => {
        const visits = await ctx.db.rotaVisit.findMany({
          where: { id: { in: input.rotaVisitIds }, status: { not: "CANCELLED" } },
          select: {
            id: true,
            visitDate: true,
            startTime: true,
            endTime: true,
            carersRequired: true,
            serviceUser: { select: { area: true } },
            assignments: { select: { staffMemberId: true } },
          },
        });
        const needing = visits.filter((v) => v.assignments.length < v.carersRequired);
        if (needing.length === 0) {
          return { assignedCount: 0, softConflictCount: 0, skipped: [] as { rotaVisitId: string; reason: string }[] };
        }

        const staffMembers = await ctx.db.staffMember.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, area: true },
        });
        const visitDates = needing.map((v) => v.visitDate.getTime());
        const context = await fetchConflictContext(ctx.db, {
          staffMemberIds: staffMembers.map((s) => s.id),
          minDate: new Date(Math.min(...visitDates)),
          maxDate: new Date(Math.max(...visitDates)),
        });

        const loadMinutes = new Map<string, number>();
        for (const a of context.assignments) {
          loadMinutes.set(a.staffMemberId, (loadMinutes.get(a.staffMemberId) ?? 0) + minutesBetween(a.rotaVisit));
        }

        const sorted = [...needing].sort((a, b) => a.startTime.localeCompare(b.startTime));
        const toCreate: { rotaVisitId: string; staffMemberId: string; conflicts: ConflictDetail[] }[] = [];
        const skipped: { rotaVisitId: string; reason: string }[] = [];

        for (const visit of sorted) {
          const alreadyOn = new Set(visit.assignments.map((a) => a.staffMemberId));
          const slotsNeeded = visit.carersRequired - visit.assignments.length;
          for (let slot = 0; slot < slotsNeeded; slot++) {
            const scored = staffMembers
              .filter((s) => !alreadyOn.has(s.id))
              .map((s) => ({
                staff: s,
                conflicts: computeConflicts(context, { staffMemberId: s.id, ...visit }, visit.id),
                sameArea: Boolean(visit.serviceUser.area) && s.area === visit.serviceUser.area,
                load: loadMinutes.get(s.id) ?? 0,
              }))
              .filter((c) => !c.conflicts.some((x) => x.type === "LEAVE" || x.type === "DOUBLE_BOOKED"));

            if (scored.length === 0) {
              skipped.push({
                rotaVisitId: visit.id,
                reason: "No staff available without a leave or double-booking conflict",
              });
              break;
            }
            // Fewer conflicts always wins first — never prefer a same-area
            // candidate with an avoidable conflict over a conflict-free
            // candidate from elsewhere. Area match and load are tie-breakers
            // among otherwise-equally-conflicted candidates.
            scored.sort(
              (a, b) =>
                a.conflicts.length - b.conflicts.length ||
                Number(b.sameArea) - Number(a.sameArea) ||
                a.load - b.load,
            );
            const chosen = scored[0];
            toCreate.push({ rotaVisitId: visit.id, staffMemberId: chosen.staff.id, conflicts: chosen.conflicts });
            alreadyOn.add(chosen.staff.id);
            loadMinutes.set(chosen.staff.id, (loadMinutes.get(chosen.staff.id) ?? 0) + minutesBetween(visit));
            context.assignments.push({
              staffMemberId: chosen.staff.id,
              rotaVisit: { id: visit.id, visitDate: visit.visitDate, startTime: visit.startTime, endTime: visit.endTime },
            });
          }
        }

        // Selection above ranks candidates against a single up-front
        // snapshot (`context`) for efficiency across many visits/staff.
        // Writing, though, re-checks each pick against fresh data inside
        // its own transaction (see tryCreateAssignment) — the snapshot can
        // go stale mid-loop (this loop itself adds assignments as it goes;
        // a concurrent auto-assign or manual assign call can too), so a
        // pick that looked conflict-free at selection time can still lose
        // the race at write time. Recompute of RotaVisit.status happens
        // inside tryCreateAssignment itself, once per successful write.
        let assignedCount = 0;
        let softConflictCount = 0;
        const visitById = new Map(needing.map((v) => [v.id, v]));

        for (const pick of toCreate) {
          const visit = visitById.get(pick.rotaVisitId);
          if (!visit) continue;

          const result = await tryCreateAssignment(ctx.db, {
            rotaVisitId: pick.rotaVisitId,
            staffMemberId: pick.staffMemberId,
            visitDate: visit.visitDate,
            startTime: visit.startTime,
            endTime: visit.endTime,
            assignedBy: ctx.user.id,
            organisationId: ctx.user.organisationId,
            // LEAVE/DOUBLE_BOOKED candidates were already excluded during
            // selection (line ~823) — an OUTSIDE_AVAILABILITY-only pick is
            // the deliberate fallback this function's doc comment
            // describes, so soft conflicts are allowed through here. A
            // fresh DOUBLE_BOOKED can still surface below if the snapshot
            // went stale — that's never overridable regardless.
            allowSoftConflictOverride: true,
          });

          if (result.status === "double_booked") {
            skipped.push({
              rotaVisitId: pick.rotaVisitId,
              reason: "A conflicting assignment for this staff member was made concurrently — skipped, retry if still needed.",
            });
            continue;
          }
          if (result.status === "created") {
            assignedCount++;
            if (result.conflicts.length > 0) softConflictCount++;
          }
        }

        return { assignedCount, softConflictCount, skipped };
      }),

    bulkUnassign: rotaManageProcedure
      .input(
        z.object({
          rotaVisitIds: z.array(z.string().min(1)).min(1),
          staffMemberIds: z.array(z.string().min(1)).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const assignments = await ctx.db.rotaVisitAssignment.findMany({
          where: {
            rotaVisitId: { in: input.rotaVisitIds },
            ...(input.staffMemberIds && { staffMemberId: { in: input.staffMemberIds } }),
          },
          select: { id: true, rotaVisitId: true },
        });
        for (const assignment of assignments) {
          await ctx.db.rotaVisitAssignment.delete({ where: { id: assignment.id } });
        }
        for (const id of new Set(assignments.map((a) => a.rotaVisitId))) {
          await recomputeVisitStatus(ctx.db, id);
        }
        return { ok: true, unassignedCount: assignments.length };
      }),
  }),

  // ── Self-service (carer's own schedule) ────
  // Deliberately plain protectedProcedure, not rotaReadProcedure — this is
  // "your own data", not a rota.read-gated view, matching the ctx.user.
  // staffMemberId self-guard convention already used in compliance.ts /
  // medication.ts rather than a new permission.
  mine: router({
    getForRange: protectedProcedure
      .input(z.object({ from: z.date(), to: z.date() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user.staffMemberId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No staff member record linked to your account. Contact a manager.",
          });
        }
        const staffMemberId = ctx.user.staffMemberId;
        const [visits, availability, leave] = await Promise.all([
          ctx.db.rotaVisit.findMany({
            where: {
              visitDate: { gte: input.from, lte: input.to },
              assignments: { some: { staffMemberId } },
            },
            orderBy: [{ visitDate: "asc" }, { startTime: "asc" }],
            include: {
              serviceUser: { select: { id: true, firstName: true, lastName: true, area: true } },
              assignments: {
                include: { staffMember: { select: { id: true, firstName: true, lastName: true } } },
              },
            },
          }),
          ctx.db.rotaAvailability.findMany({
            where: {
              staffMemberId,
              effectiveFrom: { lte: input.to },
              OR: [{ effectiveTo: null }, { effectiveTo: { gte: input.from } }],
            },
          }),
          ctx.db.staffAbsenceRecord.findMany({
            where: {
              staffMemberId,
              startDate: { lte: input.to },
              OR: [{ endDate: null }, { endDate: { gte: input.from } }],
            },
          }),
        ]);
        return { visits, availability, leave };
      }),
  }),

  // ── Combined grid data ─────────────────────
  grid: router({
    getGridData: rotaReadProcedure
      .input(z.object({ from: z.date(), to: z.date() }))
      .query(async ({ ctx, input }) => {
        const [visits, availability, leave] = await Promise.all([
          ctx.db.rotaVisit.findMany({
            where: { visitDate: { gte: input.from, lte: input.to } },
            orderBy: [{ visitDate: "asc" }, { startTime: "asc" }],
            include: {
              serviceUser: { select: { id: true, firstName: true, lastName: true, area: true } },
              assignments: {
                include: { staffMember: { select: { id: true, firstName: true, lastName: true } } },
              },
            },
          }),
          ctx.db.rotaAvailability.findMany({
            where: {
              effectiveFrom: { lte: input.to },
              OR: [{ effectiveTo: null }, { effectiveTo: { gte: input.from } }],
            },
            include: { staffMember: { select: { id: true, firstName: true, lastName: true } } },
          }),
          ctx.db.staffAbsenceRecord.findMany({
            where: {
              startDate: { lte: input.to },
              OR: [{ endDate: null }, { endDate: { gte: input.from } }],
            },
            include: { staffMember: { select: { id: true, firstName: true, lastName: true } } },
          }),
        ]);
        return { visits, availability, leave };
      }),
  }),
});

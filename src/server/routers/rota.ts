import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { DayOfWeek } from "@prisma/client";
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
        return ctx.db.rotaVisit.create({
          data: {
            ...input,
            organisationId: ctx.user.organisationId,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          },
        });
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
          select: { organisationId: true },
        });
        if (record.organisationId !== ctx.user.organisationId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
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

        const conflicts = await detectConflicts(
          ctx.db,
          { staffMemberId: input.staffMemberId, ...visit },
          input.rotaVisitId,
        );
        if (conflicts.length > 0 && !input.overrideConflict) {
          return { applied: false as const, conflicts };
        }

        const existing = await ctx.db.rotaVisitAssignment.findUnique({
          where: {
            rotaVisitId_staffMemberId: {
              rotaVisitId: input.rotaVisitId,
              staffMemberId: input.staffMemberId,
            },
          },
        });
        if (!existing) {
          await ctx.db.rotaVisitAssignment.create({
            data: {
              rotaVisitId: input.rotaVisitId,
              staffMemberId: input.staffMemberId,
              organisationId: ctx.user.organisationId,
              hasConflictOverride: conflicts.length > 0,
              conflictDetails: conflicts.length > 0 ? conflicts : undefined,
              assignedBy: ctx.user.id,
            },
          });
          await recomputeVisitStatus(ctx.db, input.rotaVisitId);
        }

        return { applied: true as const, conflicts };
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

        if (pairConflicts.length > 0 && !input.overrideConflict) {
          return { applied: false as const, conflicts: pairConflicts };
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

        const affected = new Set<string>();
        for (const pick of toCreate) {
          await ctx.db.rotaVisitAssignment.create({
            data: {
              rotaVisitId: pick.rotaVisitId,
              staffMemberId: pick.staffMemberId,
              organisationId: ctx.user.organisationId,
              hasConflictOverride: pick.conflicts.length > 0,
              conflictDetails: pick.conflicts.length > 0 ? pick.conflicts : undefined,
              assignedBy: ctx.user.id,
            },
          });
          affected.add(pick.rotaVisitId);
        }
        for (const id of affected) {
          await recomputeVisitStatus(ctx.db, id);
        }

        return {
          assignedCount: toCreate.length,
          softConflictCount: toCreate.filter((p) => p.conflicts.length > 0).length,
          skipped,
        };
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

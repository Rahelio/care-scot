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

/**
 * Checks a candidate staff/visit pairing for scheduling conflicts. Per
 * product decision, conflicts are advisory only — callers decide whether
 * to block or let the admin override, this just reports what it finds.
 */
async function detectConflicts(
  db: OrgScopedPrismaClient,
  params: { staffMemberId: string; visitDate: Date; startTime: string; endTime: string },
  excludeVisitId?: string,
): Promise<ConflictDetail[]> {
  const conflicts: ConflictDetail[] = [];

  const absences = await db.staffAbsenceRecord.findMany({
    where: {
      staffMemberId: params.staffMemberId,
      startDate: { lte: params.visitDate },
      OR: [{ endDate: null }, { endDate: { gte: params.visitDate } }],
    },
  });
  for (const absence of absences) {
    conflicts.push({
      type: "LEAVE",
      message: `On ${absence.absenceType.toLowerCase()} leave${absence.approvedBy ? "" : " (pending approval)"}`,
      absenceId: absence.id,
      absenceType: absence.absenceType,
    });
  }

  const sameDayAssignments = await db.rotaVisitAssignment.findMany({
    where: {
      staffMemberId: params.staffMemberId,
      rotaVisit: {
        visitDate: params.visitDate,
        status: { not: "CANCELLED" },
        ...(excludeVisitId && { id: { not: excludeVisitId } }),
      },
    },
    include: { rotaVisit: { select: { id: true, startTime: true, endTime: true } } },
  });
  for (const assignment of sameDayAssignments) {
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
  const availability = await db.rotaAvailability.findMany({
    where: {
      staffMemberId: params.staffMemberId,
      dayOfWeek,
      effectiveFrom: { lte: params.visitDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: params.visitDate } }],
    },
  });
  const withinAvailability = availability.some(
    (a) => a.isAvailable && a.availableFrom <= params.startTime && params.endTime <= a.availableTo,
  );
  if (!withinAvailability) {
    conflicts.push({
      type: "OUTSIDE_AVAILABILITY",
      message: "No matching availability window recorded for this staff member",
    });
  }

  return conflicts;
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

        const pairConflicts: { rotaVisitId: string; staffMemberId: string; conflicts: ConflictDetail[] }[] = [];
        for (const visit of visits) {
          for (const staffMemberId of input.staffMemberIds) {
            const conflicts = await detectConflicts(ctx.db, { staffMemberId, ...visit }, visit.id);
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
              serviceUser: { select: { id: true, firstName: true, lastName: true } },
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

/**
 * Rota Router — STUB
 *
 * This router exposes a read-only integration interface.
 * Business logic is implemented in the external rota system
 * which populates the rota_shifts and rota_availability tables.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const rotaRouter = router({
  /** IRota.getStaffSchedule(staffId, dateRange) */
  getStaffSchedule: protectedProcedure
    .input(
      z.object({
        staffId: z.string().uuid(),
        from: z.date(),
        to: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.rotaShift.findMany({
        where: {
          organisationId,
          staffMemberId: input.staffId,
          shiftDate: { gte: input.from, lte: input.to },
        },
        orderBy: [{ shiftDate: "asc" }, { startTime: "asc" }],
        include: {
          serviceUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    }),

  /** IRota.getServiceUserVisits(serviceUserId, dateRange) */
  getServiceUserVisits: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().uuid(),
        from: z.date(),
        to: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.rotaShift.findMany({
        where: {
          organisationId,
          serviceUserId: input.serviceUserId,
          shiftDate: { gte: input.from, lte: input.to },
        },
        orderBy: [{ shiftDate: "asc" }, { startTime: "asc" }],
        include: {
          staffMember: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    }),

  /** IRota.getUnfilledShifts(dateRange) */
  getUnfilledShifts: protectedProcedure
    .input(
      z.object({
        from: z.date(),
        to: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.rotaShift.findMany({
        where: {
          organisationId,
          status: "SCHEDULED",
          shiftDate: { gte: input.from, lte: input.to },
        },
        orderBy: [{ shiftDate: "asc" }, { startTime: "asc" }],
      });
    }),

  /** IRota.assignStaffToShift(shiftId, staffId) */
  assignStaffToShift: protectedProcedure
    .input(
      z.object({
        shiftId: z.string().uuid(),
        staffId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.rotaShift.update({
        where: { id: input.shiftId, organisationId },
        data: { staffMemberId: input.staffId, status: "CONFIRMED" },
      });
    }),
});

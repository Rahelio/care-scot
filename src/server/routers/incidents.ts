import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { IncidentStatus, IncidentSeverity } from "@prisma/client";

export const incidentsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(IncidentStatus).optional(),
        severity: z.nativeEnum(IncidentSeverity).optional(),
        serviceUserId: z.string().uuid().optional(),
        from: z.date().optional(),
        to: z.date().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      const skip = (input.page - 1) * input.limit;

      const where = {
        organisationId,
        ...(input.status && { status: input.status }),
        ...(input.severity && { severity: input.severity }),
        ...(input.serviceUserId && { serviceUserId: input.serviceUserId }),
        ...(input.from || input.to
          ? {
              incidentDate: {
                ...(input.from && { gte: input.from }),
                ...(input.to && { lte: input.to }),
              },
            }
          : {}),
      };

      const [items, total] = await Promise.all([
        ctx.prisma.incident.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { incidentDate: "desc" },
          include: {
            serviceUser: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        }),
        ctx.prisma.incident.count({ where }),
      ]);

      return { items, total, page: input.page, limit: input.limit };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.incident.findUniqueOrThrow({
        where: { id: input.id, organisationId },
        include: {
          serviceUser: {
            select: { id: true, firstName: true, lastName: true },
          },
          staffMember: {
            select: { id: true, firstName: true, lastName: true },
          },
          reportedByUser: {
            select: { id: true, email: true },
          },
          careInspNotifications: true,
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().uuid().optional(),
        staffMemberId: z.string().uuid().optional(),
        incidentType: z.string(),
        incidentDate: z.date(),
        incidentTime: z.string().optional(),
        location: z.string().optional(),
        description: z.string().optional(),
        severity: z.nativeEnum(IncidentSeverity),
        witnesses: z.string().optional(),
        immediateActionTaken: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      return ctx.prisma.incident.create({
        data: {
          ...input,
          incidentType: input.incidentType as never,
          organisationId,
          reportedBy: userId,
          reportedDate: new Date(),
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        investigationNotes: z.string().optional(),
        rootCause: z.string().optional(),
        actionsToPreventRecurrence: z.array(z.unknown()).optional(),
        outcome: z.string().optional(),
        status: z.nativeEnum(IncidentStatus).optional(),
        riddorReportable: z.boolean().optional(),
        riddorReference: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      const { id, ...data } = input;

      const update: Record<string, unknown> = { ...data, updatedBy: userId };
      if (data.status === "CLOSED") {
        update.closedBy = userId;
        update.closedDate = new Date();
      }

      return ctx.prisma.incident.update({
        where: { id, organisationId },
        data: update,
      });
    }),

  // ── Safeguarding ──────────────────────────
  listSafeguarding: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().uuid().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.safeguardingConcern.findMany({
        where: {
          organisationId,
          ...(input.serviceUserId && { serviceUserId: input.serviceUserId }),
        },
        take: input.limit,
        skip: (input.page - 1) * input.limit,
        orderBy: { concernDate: "desc" },
        include: {
          serviceUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    }),

  createSafeguardingConcern: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().uuid(),
        concernDate: z.date(),
        concernType: z.string(),
        description: z.string().optional(),
        referredTo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      return ctx.prisma.safeguardingConcern.create({
        data: {
          ...input,
          concernType: input.concernType as never,
          organisationId,
          raisedBy: userId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }),
});

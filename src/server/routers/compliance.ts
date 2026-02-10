import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { PolicyStatus } from "@prisma/client";

export const complianceRouter = router({
  // ── Policies ──────────────────────────────
  listPolicies: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(PolicyStatus).optional(),
        search: z.string().optional(),
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
        ...(input.search && {
          policyName: { contains: input.search, mode: "insensitive" as const },
        }),
      };
      const [items, total] = await Promise.all([
        ctx.prisma.policy.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { policyName: "asc" },
        }),
        ctx.prisma.policy.count({ where }),
      ]);
      return { items, total, page: input.page, limit: input.limit };
    }),

  // ── Complaints ────────────────────────────
  listComplaints: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      const skip = (input.page - 1) * input.limit;
      const where = {
        organisationId,
        ...(input.status && { status: input.status as never }),
      };
      const [items, total] = await Promise.all([
        ctx.prisma.complaint.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { dateReceived: "desc" },
          include: {
            serviceUser: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        }),
        ctx.prisma.complaint.count({ where }),
      ]);
      return { items, total, page: input.page, limit: input.limit };
    }),

  createComplaint: protectedProcedure
    .input(
      z.object({
        dateReceived: z.date(),
        complainantName: z.string().min(1),
        complainantRelationship: z.string().optional(),
        serviceUserId: z.string().uuid().optional(),
        natureOfComplaint: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      return ctx.prisma.complaint.create({
        data: { ...input, organisationId, createdBy: userId, updatedBy: userId },
      });
    }),

  // ── Quality Audits ────────────────────────
  listAudits: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      const skip = (input.page - 1) * input.limit;
      const [items, total] = await Promise.all([
        ctx.prisma.qualityAudit.findMany({
          where: { organisationId },
          skip,
          take: input.limit,
          orderBy: { auditDate: "desc" },
        }),
        ctx.prisma.qualityAudit.count({ where: { organisationId } }),
      ]);
      return { items, total, page: input.page, limit: input.limit };
    }),

  // ── Inspections ───────────────────────────
  listInspections: protectedProcedure.query(async ({ ctx }) => {
    const { organisationId } = ctx.user as { organisationId: string };
    return ctx.prisma.careInspectorateInspection.findMany({
      where: { organisationId },
      orderBy: { inspectionDate: "desc" },
    });
  }),

  // ── Care Inspectorate Notifications ───────
  listNotifications: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      const skip = (input.page - 1) * input.limit;
      return ctx.prisma.careInspectorateNotification.findMany({
        where: { organisationId },
        skip,
        take: input.limit,
        orderBy: { createdAt: "desc" },
      });
    }),
});

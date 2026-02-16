import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { requireRole } from "../middleware/rbac";
import { AuditAction } from "@prisma/client";

const MANAGER_ROLES = ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"] as const;

export const auditRouter = router({
  /**
   * Paginated list of audit entries for the current organisation.
   * Filterable by entity_type, action, user ID, and date range.
   * MANAGER+ only.
   */
  list: protectedProcedure
    .use(requireRole([...MANAGER_ROLES]))
    .input(
      z.object({
        entityType: z.string().optional(),
        action: z.nativeEnum(AuditAction).optional(),
        userId: z.string().uuid().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(25),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      const skip = (input.page - 1) * input.limit;

      const where = {
        organisationId,
        ...(input.entityType && { entityType: input.entityType }),
        ...(input.action && { action: input.action }),
        ...(input.userId && { userId: input.userId }),
        ...((input.dateFrom || input.dateTo) && {
          createdAt: {
            ...(input.dateFrom && { gte: input.dateFrom }),
            ...(input.dateTo && { lte: input.dateTo }),
          },
        }),
      };

      const [items, total] = await Promise.all([
        ctx.prisma.auditLog.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        }),
        ctx.prisma.auditLog.count({ where }),
      ]);

      return { items, total, page: input.page, limit: input.limit };
    }),

  /**
   * All audit entries for a specific entity (entity_type + entity_id).
   * Returns newest-first. MANAGER+ only.
   */
  getByEntity: protectedProcedure
    .use(requireRole([...MANAGER_ROLES]))
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };

      return ctx.prisma.auditLog.findMany({
        where: {
          organisationId,
          entityType: input.entityType,
          entityId: input.entityId,
        },
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      });
    }),
});

import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const notificationsRouter = router({
  /**
   * Unread notifications for the current user — used by the bell badge.
   */
  getUnread: protectedProcedure.query(async ({ ctx }) => {
    const { id: userId, organisationId } = ctx.user as {
      id: string;
      organisationId: string;
    };
    return ctx.prisma.notification.findMany({
      where: { userId, organisationId, isRead: false },
      orderBy: { createdAt: "desc" },
    });
  }),

  /**
   * All notifications for the current user, newest first (max 50).
   */
  getAll: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const { id: userId, organisationId } = ctx.user as {
        id: string;
        organisationId: string;
      };
      return ctx.prisma.notification.findMany({
        where: { userId, organisationId },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  /**
   * Mark a single notification as read.
   */
  markRead: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user as { id: string };
      await ctx.prisma.notification.updateMany({
        where: { id: input.id, userId },
        data: { isRead: true, readAt: new Date() },
      });
      return { success: true };
    }),

  /**
   * Mark all notifications as read for the current user.
   */
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const { id: userId, organisationId } = ctx.user as {
      id: string;
      organisationId: string;
    };
    await ctx.prisma.notification.updateMany({
      where: { userId, organisationId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }),
});

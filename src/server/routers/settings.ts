import { z } from "zod";
import { hash } from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { Prisma, UserRole } from "@prisma/client";
import { router, protectedProcedure } from "../trpc";
import { requirePermission } from "../middleware/rbac";

const settingsProcedure = protectedProcedure.use(
  requirePermission("settings.manage"),
);

const usersMgmtProcedure = protectedProcedure.use(
  requirePermission("users.manage"),
);

// ─── Org sub-router ──────────────────────────────────────────────────────────

const orgRouter = router({
  get: settingsProcedure.query(async ({ ctx }) => {
    const { organisationId } = ctx.user as { organisationId: string };
    return ctx.prisma.organisation.findUniqueOrThrow({
      where: { id: organisationId },
    });
  }),

  update: settingsProcedure
    .input(
      z.object({
        name: z.string().min(1, "Organisation name is required"),
        careInspectorateRegNumber: z.string().optional(),
        registeredAddress: z.string().optional(),
        registeredManagerName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email("Invalid email").optional().or(z.literal("")),
        registrationConditions: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.organisation.update({
        where: { id: organisationId },
        data: {
          name: input.name,
          careInspectorateRegNumber: input.careInspectorateRegNumber || null,
          registeredAddress: input.registeredAddress || null,
          registeredManagerName: input.registeredManagerName || null,
          phone: input.phone || null,
          email: input.email || null,
          registrationConditions: input.registrationConditions || null,
        },
      });
    }),

  getSystemStats: settingsProcedure.query(async ({ ctx }) => {
    const { organisationId } = ctx.user as { organisationId: string };
    const [auditLogCount, fileCount, fileSizeAgg] = await Promise.all([
      ctx.prisma.auditLog.count({ where: { organisationId } }),
      ctx.prisma.file.count({ where: { organisationId } }),
      ctx.prisma.file.aggregate({
        where: { organisationId },
        _sum: { fileSizeBytes: true },
      }),
    ]);
    return {
      auditLogCount,
      fileCount,
      totalFileSizeBytes: Number(fileSizeAgg._sum?.fileSizeBytes ?? 0),
    };
  }),
});

// ─── Users sub-router ────────────────────────────────────────────────────────

const usersRouter = router({
  list: usersMgmtProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      const where: Prisma.UserWhereInput = {
        organisationId,
        ...(input.search
          ? {
              OR: [
                { email: { contains: input.search, mode: "insensitive" } },
                { name: { contains: input.search, mode: "insensitive" } },
              ],
            }
          : {}),
      };
      const [items, total] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            staffMemberId: true,
            staffMember: {
              select: { id: true, firstName: true, lastName: true },
            },
            createdAt: true,
          },
        }),
        ctx.prisma.user.count({ where }),
      ]);
      return { items, total, page: input.page, limit: input.limit };
    }),

  create: usersMgmtProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        name: z.string().optional(),
        role: z.nativeEnum(UserRole),
        staffMemberId: z.string().min(1).optional(),
        tempPassword: z.string().min(8, "Password must be at least 8 characters"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };

      // Validate staff member belongs to same org
      if (input.staffMemberId) {
        const staff = await ctx.prisma.staffMember.findFirst({
          where: { id: input.staffMemberId, organisationId },
          select: { id: true },
        });
        if (!staff) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Staff member not found in this organisation.",
          });
        }
      }

      const passwordHash = await hash(input.tempPassword, 12);

      try {
        const user = await ctx.prisma.user.create({
          data: {
            organisationId,
            email: input.email,
            name: input.name || null,
            role: input.role,
            staffMemberId: input.staffMemberId || null,
            passwordHash,
            isActive: true,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        });
        return user;
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A user with this email already exists.",
          });
        }
        throw e;
      }
    }),

  updateRole: usersMgmtProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        role: z.nativeEnum(UserRole),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: currentUserId } = ctx.user as {
        organisationId: string;
        id: string;
      };

      if (input.userId === currentUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot change your own role.",
        });
      }

      return ctx.prisma.user.update({
        where: { id: input.userId, organisationId },
        data: { role: input.role },
        select: { id: true, email: true, role: true },
      });
    }),

  deactivate: usersMgmtProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: currentUserId } = ctx.user as {
        organisationId: string;
        id: string;
      };

      if (input.userId === currentUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot deactivate your own account.",
        });
      }

      return ctx.prisma.user.update({
        where: { id: input.userId, organisationId },
        data: { isActive: false },
        select: { id: true, email: true, isActive: true },
      });
    }),

  reactivate: usersMgmtProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };

      return ctx.prisma.user.update({
        where: { id: input.userId, organisationId },
        data: { isActive: true },
        select: { id: true, email: true, isActive: true },
      });
    }),

  linkStaffMember: usersMgmtProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        staffMemberId: z.string().min(1).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };

      if (input.staffMemberId) {
        const staff = await ctx.prisma.staffMember.findFirst({
          where: { id: input.staffMemberId, organisationId },
          select: { id: true },
        });
        if (!staff) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Staff member not found in this organisation.",
          });
        }
      }

      return ctx.prisma.user.update({
        where: { id: input.userId, organisationId },
        data: { staffMemberId: input.staffMemberId },
        select: {
          id: true,
          email: true,
          staffMemberId: true,
          staffMember: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    }),
});

// ─── Combined settings router ────────────────────────────────────────────────

export const settingsRouter = router({
  org: orgRouter,
  users: usersRouter,
});

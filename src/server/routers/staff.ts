import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { StaffStatus, StaffRoleType, EmploymentType } from "@prisma/client";

export const staffRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(StaffStatus).optional(),
        roleType: z.nativeEnum(StaffRoleType).optional(),
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
        ...(input.roleType && { roleType: input.roleType }),
        ...(input.search && {
          OR: [
            { firstName: { contains: input.search, mode: "insensitive" as const } },
            { lastName: { contains: input.search, mode: "insensitive" as const } },
            { email: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [items, total] = await Promise.all([
        ctx.prisma.staffMember.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            roleType: true,
            employmentType: true,
            status: true,
            startDate: true,
            phone: true,
            email: true,
          },
        }),
        ctx.prisma.staffMember.count({ where }),
      ]);

      return { items, total, page: input.page, limit: input.limit };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.staffMember.findUniqueOrThrow({
        where: { id: input.id, organisationId },
        include: {
          pvgRecords: true,
          registrations: true,
          references: true,
          healthDeclarations: { orderBy: { declarationDate: "desc" }, take: 1 },
          induction: true,
          trainingRecords: { orderBy: { completionDate: "desc" } },
          supervisions: { orderBy: { supervisionDate: "desc" }, take: 5 },
          appraisals: { orderBy: { appraisalDate: "desc" }, take: 3 },
          absenceRecords: { orderBy: { startDate: "desc" }, take: 10 },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        dateOfBirth: z.date().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        jobTitle: z.string().optional(),
        roleType: z.nativeEnum(StaffRoleType),
        employmentType: z.nativeEnum(EmploymentType),
        startDate: z.date(),
        contractHoursPerWeek: z.number().optional(),
        addressLine1: z.string().optional(),
        addressLine2: z.string().optional(),
        city: z.string().optional(),
        postcode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      return ctx.prisma.staffMember.create({
        data: { ...input, organisationId, createdBy: userId, updatedBy: userId },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        jobTitle: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        status: z.nativeEnum(StaffStatus).optional(),
        endDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      const { id, ...data } = input;
      return ctx.prisma.staffMember.update({
        where: { id, organisationId },
        data: { ...data, updatedBy: userId },
      });
    }),

  // ── Training Records ──────────────────────
  addTraining: protectedProcedure
    .input(
      z.object({
        staffMemberId: z.string().uuid(),
        trainingType: z.string(),
        trainingName: z.string().min(1),
        trainingProvider: z.string().optional(),
        completionDate: z.date(),
        expiryDate: z.date().optional(),
        isMandatory: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      return ctx.prisma.staffTrainingRecord.create({
        data: {
          ...input,
          trainingType: input.trainingType as never,
          organisationId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }),

  // ── Supervisions ──────────────────────────
  addSupervision: protectedProcedure
    .input(
      z.object({
        staffMemberId: z.string().uuid(),
        supervisionDate: z.date(),
        supervisorId: z.string().uuid().optional(),
        supervisionType: z.enum(["INDIVIDUAL", "GROUP", "SPOT_CHECK", "OBSERVATION"]),
        discussionNotes: z.string().optional(),
        agreedActions: z.array(z.object({
          action: z.string(),
          dueDate: z.string().optional(),
          completed: z.boolean().default(false),
        })).optional(),
        nextSupervisionDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      return ctx.prisma.staffSupervision.create({
        data: { ...input, organisationId, createdBy: userId, updatedBy: userId },
      });
    }),
});

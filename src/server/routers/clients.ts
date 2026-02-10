import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { ServiceUserStatus } from "@prisma/client";

export const clientsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(ServiceUserStatus).optional(),
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
          OR: [
            { firstName: { contains: input.search, mode: "insensitive" as const } },
            { lastName: { contains: input.search, mode: "insensitive" as const } },
            { chiNumber: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [items, total] = await Promise.all([
        ctx.prisma.serviceUser.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            chiNumber: true,
            postcode: true,
            phonePrimary: true,
            status: true,
            createdAt: true,
          },
        }),
        ctx.prisma.serviceUser.count({ where }),
      ]);

      return { items, total, page: input.page, limit: input.limit };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.serviceUser.findUniqueOrThrow({
        where: { id: input.id, organisationId },
        include: {
          contacts: true,
          healthcareProfessionals: true,
          personalPlans: {
            where: { status: "ACTIVE" },
            orderBy: { planVersion: "desc" },
            take: 1,
          },
          riskAssessments: { where: { status: "ACTIVE" } },
          consentRecords: { orderBy: { consentDate: "desc" } },
          serviceAgreements: { orderBy: { startDate: "desc" }, take: 1 },
          healthRecords: { orderBy: { recordedDate: "desc" }, take: 10 },
          medications: { where: { status: "ACTIVE" } },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        dateOfBirth: z.date(),
        chiNumber: z.string().optional(),
        addressLine1: z.string().optional(),
        addressLine2: z.string().optional(),
        city: z.string().optional(),
        postcode: z.string().optional(),
        phonePrimary: z.string().optional(),
        phoneSecondary: z.string().optional(),
        email: z.string().email().optional(),
        gpName: z.string().optional(),
        gpPractice: z.string().optional(),
        gpPhone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };

      return ctx.prisma.serviceUser.create({
        data: {
          ...input,
          organisationId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        dateOfBirth: z.date().optional(),
        chiNumber: z.string().optional(),
        addressLine1: z.string().optional(),
        addressLine2: z.string().optional(),
        city: z.string().optional(),
        postcode: z.string().optional(),
        phonePrimary: z.string().optional(),
        phoneSecondary: z.string().optional(),
        email: z.string().email().optional(),
        gpName: z.string().optional(),
        gpPractice: z.string().optional(),
        gpPhone: z.string().optional(),
        communicationNeeds: z.string().optional(),
        languagePreference: z.string().optional(),
        interpreterRequired: z.boolean().optional(),
        culturalReligiousNeeds: z.string().optional(),
        dietaryRequirements: z.string().optional(),
        dailyRoutinePreferences: z.string().optional(),
        advanceCarePlan: z.string().optional(),
        status: z.nativeEnum(ServiceUserStatus).optional(),
        dischargeDate: z.date().optional(),
        dischargeReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      const { id, ...data } = input;

      return ctx.prisma.serviceUser.update({
        where: { id, organisationId },
        data: { ...data, updatedBy: userId },
      });
    }),

  // ── Contacts ──────────────────────────────
  addContact: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().uuid(),
        contactName: z.string().min(1),
        relationship: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        isNextOfKin: z.boolean().default(false),
        isEmergencyContact: z.boolean().default(false),
        hasPowerOfAttorney: z.boolean().default(false),
        poaType: z.enum(["WELFARE", "FINANCIAL", "BOTH"]).optional(),
        isGuardian: z.boolean().default(false),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      return ctx.prisma.serviceUserContact.create({
        data: { ...input, organisationId, createdBy: userId, updatedBy: userId },
      });
    }),

  // ── Personal Plans ─────────────────────────
  createPersonalPlan: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().uuid(),
        initialAssessment: z.string().optional(),
        healthNeeds: z.string().optional(),
        welfareNeeds: z.string().optional(),
        personalCareRequirements: z.string().optional(),
        howNeedsWillBeMet: z.string().optional(),
        wishesAndPreferences: z.string().optional(),
        goalsAndOutcomes: z.string().optional(),
        nextReviewDate: z.date().optional(),
        consultedWithServiceUser: z.boolean().default(false),
        consultationNotes: z.string().optional(),
        consultedWithRepresentative: z.boolean().default(false),
        repConsultationNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };

      const latestPlan = await ctx.prisma.personalPlan.findFirst({
        where: { serviceUserId: input.serviceUserId, organisationId },
        orderBy: { planVersion: "desc" },
        select: { planVersion: true },
      });

      const planVersion = (latestPlan?.planVersion ?? 0) + 1;

      return ctx.prisma.personalPlan.create({
        data: {
          ...input,
          organisationId,
          planVersion,
          createdDate: new Date(),
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }),

  // ── Care Visit Records ─────────────────────
  getVisits: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().uuid(),
        from: z.date().optional(),
        to: z.date().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      const skip = (input.page - 1) * input.limit;

      return ctx.prisma.careVisitRecord.findMany({
        where: {
          serviceUserId: input.serviceUserId,
          organisationId,
          ...(input.from && { visitDate: { gte: input.from } }),
          ...(input.to && { visitDate: { lte: input.to } }),
        },
        skip,
        take: input.limit,
        orderBy: { visitDate: "desc" },
        include: {
          staffMember: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    }),
});

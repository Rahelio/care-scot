import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { ServiceUserStatus, RiskAssessmentType, RiskLevel, ConsentType, StaffAssignmentRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createAuditLog } from "../middleware/audit";

const MANAGER_ROLES = ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"] as const;

export const clientsRouter = router({
  // ─────────────────────────────────────────
  // SERVICE USERS
  // ─────────────────────────────────────────

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

      const [rawItems, total] = await Promise.all([
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
            _count: {
              select: {
                personalPlans: { where: { status: "ACTIVE" } },
                consentRecords: true,
                serviceAgreements: { where: { signedByServiceUser: true, signedByProvider: true } },
              },
            },
            riskAssessments: {
              where: { status: "ACTIVE" },
              select: { assessmentType: true },
            },
          },
        }),
        ctx.prisma.serviceUser.count({ where }),
      ]);

      const items = rawItems.map(({ _count, riskAssessments, ...rest }) => {
        const hasActivePlan = _count.personalPlans > 0;
        const hasSignedAgreement = _count.serviceAgreements > 0;
        const hasConsent = _count.consentRecords > 0;
        const riskAssessmentCount = new Set(riskAssessments.map((r) => r.assessmentType)).size;
        const score =
          (hasActivePlan ? 1 : 0) +
          (hasSignedAgreement ? 1 : 0) +
          (hasConsent ? 1 : 0) +
          (riskAssessmentCount === 9 ? 1 : 0);
        return {
          ...rest,
          completeness: { hasActivePlan, hasSignedAgreement, hasConsent, riskAssessmentCount, score },
        };
      });

      return { items, total, page: input.page, limit: input.limit };
    }),

  /** Minimal fetch for profile layout header */
  getProfile: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };

      const [serviceUser, activePlanCount] = await Promise.all([
        ctx.prisma.serviceUser.findUniqueOrThrow({
          where: { id: input.id, organisationId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            chiNumber: true,
            status: true,
            createdAt: true,
          },
        }),
        ctx.prisma.personalPlan.count({
          where: { serviceUserId: input.id, status: "ACTIVE" },
        }),
      ]);

      return { ...serviceUser, hasActivePlan: activePlanCount > 0 };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.serviceUser.findUniqueOrThrow({
        where: { id: input.id, organisationId },
        include: {
          contacts: { orderBy: { isNextOfKin: "desc" } },
          healthcareProfessionals: true,
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        dateOfBirth: z.coerce.date(),
        chiNumber: z.string().optional(),
        addressLine1: z.string().optional(),
        addressLine2: z.string().optional(),
        city: z.string().optional(),
        postcode: z.string().optional(),
        phonePrimary: z.string().optional(),
        phoneSecondary: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
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
      const data = { ...input, email: input.email || undefined };

      if (input.chiNumber) {
        const existing = await ctx.prisma.serviceUser.findFirst({
          where: { organisationId, chiNumber: input.chiNumber },
          select: { firstName: true, lastName: true },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `CHI number already assigned to ${existing.firstName} ${existing.lastName}`,
          });
        }
      }

      return ctx.prisma.serviceUser.create({
        data: { ...data, organisationId, createdBy: userId, updatedBy: userId },
      });
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        status: z.nativeEnum(ServiceUserStatus),
        dischargeDate: z.coerce.date().optional(),
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

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        dateOfBirth: z.coerce.date().optional(),
        chiNumber: z.string().optional(),
        addressLine1: z.string().optional(),
        addressLine2: z.string().optional(),
        city: z.string().optional(),
        postcode: z.string().optional(),
        phonePrimary: z.string().optional(),
        phoneSecondary: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
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
        dischargeDate: z.coerce.date().optional(),
        dischargeReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      const { id, email, ...rest } = input;

      if (input.chiNumber) {
        const existing = await ctx.prisma.serviceUser.findFirst({
          where: { organisationId, chiNumber: input.chiNumber, NOT: { id } },
          select: { firstName: true, lastName: true },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `CHI number already assigned to ${existing.firstName} ${existing.lastName}`,
          });
        }
      }

      return ctx.prisma.serviceUser.update({
        where: { id, organisationId },
        data: { ...rest, email: email || undefined, updatedBy: userId },
      });
    }),

  // ─────────────────────────────────────────
  // CONTACTS
  // ─────────────────────────────────────────

  addContact: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        contactName: z.string().min(1),
        relationship: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
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
      const { email, ...rest } = input;
      return ctx.prisma.serviceUserContact.create({
        data: {
          ...rest,
          email: email || undefined,
          organisationId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }),

  updateContact: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        contactName: z.string().min(1).optional(),
        relationship: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        isNextOfKin: z.boolean().optional(),
        isEmergencyContact: z.boolean().optional(),
        hasPowerOfAttorney: z.boolean().optional(),
        poaType: z.enum(["WELFARE", "FINANCIAL", "BOTH"]).optional(),
        isGuardian: z.boolean().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user as { id: string };
      const { id, email, ...rest } = input;
      return ctx.prisma.serviceUserContact.update({
        where: { id },
        data: { ...rest, email: email || undefined, updatedBy: userId },
      });
    }),

  removeContact: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.serviceUserContact.delete({ where: { id: input.id } });
    }),

  // ─────────────────────────────────────────
  // HEALTHCARE PROFESSIONALS
  // ─────────────────────────────────────────

  addHealthcareProfessional: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        professionalName: z.string().min(1),
        role: z.string().optional(),
        organisation: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      const { email, ...rest } = input;
      return ctx.prisma.serviceUserHealthcareProfessional.create({
        data: {
          ...rest,
          email: email || undefined,
          organisationId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }),

  removeHealthcareProfessional: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.serviceUserHealthcareProfessional.delete({
        where: { id: input.id },
      });
    }),

  // ─────────────────────────────────────────
  // PERSONAL PLANS
  // ─────────────────────────────────────────

  listPersonalPlans: protectedProcedure
    .input(z.object({ serviceUserId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.personalPlan.findMany({
        where: { serviceUserId: input.serviceUserId, organisationId },
        orderBy: { planVersion: "desc" },
        include: {
          approvedByUser: { select: { name: true, email: true } },
          createdByUser: { select: { name: true, email: true } },
        },
      });
    }),

  createPersonalPlan: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        initialAssessment: z.string().optional(),
        healthNeeds: z.string().optional(),
        welfareNeeds: z.string().optional(),
        personalCareRequirements: z.string().optional(),
        howNeedsWillBeMet: z.string().optional(),
        wishesAndPreferences: z.string().optional(),
        goalsAndOutcomes: z.string().optional(),
        nextReviewDate: z.coerce.date().optional(),
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

      const [latestPlan] = await ctx.prisma.$transaction([
        ctx.prisma.personalPlan.findFirst({
          where: { serviceUserId: input.serviceUserId, organisationId },
          orderBy: { planVersion: "desc" },
          select: { planVersion: true },
        }),
      ]);

      const planVersion = (latestPlan?.planVersion ?? 0) + 1;

      // Supersede any existing ACTIVE plans
      await ctx.prisma.personalPlan.updateMany({
        where: {
          serviceUserId: input.serviceUserId,
          organisationId,
          status: "ACTIVE",
        },
        data: { status: "SUPERSEDED" },
      });

      return ctx.prisma.personalPlan.create({
        data: {
          ...input,
          organisationId,
          planVersion,
          createdDate: new Date(),
          status: "DRAFT",
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }),

  updatePersonalPlan: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        initialAssessment: z.string().optional(),
        healthNeeds: z.string().optional(),
        welfareNeeds: z.string().optional(),
        personalCareRequirements: z.string().optional(),
        howNeedsWillBeMet: z.string().optional(),
        wishesAndPreferences: z.string().optional(),
        goalsAndOutcomes: z.string().optional(),
        nextReviewDate: z.coerce.date().optional().nullable(),
        consultedWithServiceUser: z.boolean().optional(),
        consultationNotes: z.string().optional(),
        consultedWithRepresentative: z.boolean().optional(),
        repConsultationNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      const existing = await ctx.prisma.personalPlan.findUniqueOrThrow({
        where: { id: input.id, organisationId },
        select: { status: true },
      });
      if (existing.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only DRAFT plans can be edited.",
        });
      }
      const { id, ...data } = input;
      return ctx.prisma.personalPlan.update({
        where: { id },
        data: { ...data, updatedBy: userId },
      });
    }),

  getActivePlan: protectedProcedure
    .input(z.object({ serviceUserId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.personalPlan.findFirst({
        where: { serviceUserId: input.serviceUserId, organisationId, status: "ACTIVE" },
        include: {
          approvedByUser: { select: { name: true, email: true } },
          createdByUser: { select: { name: true, email: true } },
        },
      });
    }),

  notifyPlanReady: protectedProcedure
    .input(
      z.object({
        planId: z.string().min(1),
        serviceUserId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };

      const [plan, serviceUser, managers] = await Promise.all([
        ctx.prisma.personalPlan.findUniqueOrThrow({
          where: { id: input.planId, organisationId },
          select: { status: true, planVersion: true },
        }),
        ctx.prisma.serviceUser.findUniqueOrThrow({
          where: { id: input.serviceUserId, organisationId },
          select: { firstName: true, lastName: true },
        }),
        ctx.prisma.user.findMany({
          where: {
            organisationId,
            role: { in: ["MANAGER", "ORG_ADMIN"] },
            id: { not: userId },
          },
          select: { id: true },
        }),
      ]);

      if (plan.status !== "DRAFT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Plan is not a draft." });
      }

      if (managers.length === 0) return { notified: 0 };

      await ctx.prisma.notification.createMany({
        data: managers.map((m) => ({
          userId: m.id,
          organisationId,
          title: "Personal plan ready for approval",
          message: `v${plan.planVersion} personal plan for ${serviceUser.firstName} ${serviceUser.lastName} is ready for review and approval.`,
          entityType: "personal_plan",
          entityId: input.planId,
          link: `/clients/${input.serviceUserId}/personal-plan`,
        })),
      });

      return { notified: managers.length };
    }),

  approvePlan: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { id: userId, role } = ctx.user as { id: string; role: string };
      if (!MANAGER_ROLES.includes(role as never)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only managers can approve personal plans",
        });
      }
      return ctx.prisma.personalPlan.update({
        where: { id: input.id },
        data: {
          status: "ACTIVE",
          approvedBy: userId,
          approvedAt: new Date(),
          updatedBy: userId,
        },
      });
    }),

  // ─────────────────────────────────────────
  // RISK ASSESSMENTS
  // ─────────────────────────────────────────

  listRiskAssessments: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        status: z.enum(["ACTIVE", "SUPERSEDED"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.riskAssessment.findMany({
        where: {
          serviceUserId: input.serviceUserId,
          organisationId,
          status: input.status ?? "ACTIVE",
        },
        orderBy: { assessmentDate: "desc" },
        include: {
          assessedByUser: { select: { name: true, email: true } },
        },
      });
    }),

  createRiskAssessment: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        assessmentType: z.nativeEnum(RiskAssessmentType),
        riskLevel: z.nativeEnum(RiskLevel),
        assessmentDetail: z.string().optional(),
        controlMeasures: z.string().optional(),
        assessmentDate: z.coerce.date(),
        reviewDate: z.coerce.date().optional(),
        nextReviewDate: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };

      // Supersede existing assessment of the same type
      await ctx.prisma.riskAssessment.updateMany({
        where: {
          serviceUserId: input.serviceUserId,
          organisationId,
          assessmentType: input.assessmentType,
          status: "ACTIVE",
        },
        data: { status: "SUPERSEDED" },
      });

      return ctx.prisma.riskAssessment.create({
        data: {
          ...input,
          organisationId,
          assessedBy: userId,
          status: "ACTIVE",
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }),

  getRiskAssessmentHistory: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        assessmentType: z.nativeEnum(RiskAssessmentType),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.riskAssessment.findMany({
        where: {
          serviceUserId: input.serviceUserId,
          organisationId,
          assessmentType: input.assessmentType,
        },
        orderBy: { assessmentDate: "desc" },
        include: {
          assessedByUser: { select: { name: true, email: true } },
        },
      });
    }),

  updateRiskAssessment: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        riskLevel: z.nativeEnum(RiskLevel).optional(),
        assessmentDetail: z.string().optional(),
        controlMeasures: z.string().optional(),
        nextReviewDate: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user as { id: string };
      const { id, ...data } = input;
      return ctx.prisma.riskAssessment.update({
        where: { id },
        data: { ...data, updatedBy: userId },
      });
    }),

  // ─────────────────────────────────────────
  // CONSENT RECORDS
  // ─────────────────────────────────────────

  listConsentRecords: protectedProcedure
    .input(z.object({ serviceUserId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.consentRecord.findMany({
        where: { serviceUserId: input.serviceUserId, organisationId },
        orderBy: { consentDate: "desc" },
      });
    }),

  createConsentRecord: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        consentType: z.nativeEnum(ConsentType),
        consentGiven: z.boolean(),
        capacityAssessed: z.boolean().default(false),
        capacityOutcome: z.string().optional(),
        awiDocumentation: z.string().optional(),
        bestInterestDecision: z.string().optional(),
        signedBy: z.string().optional(),
        relationshipToServiceUser: z.string().optional(),
        consentDate: z.coerce.date(),
        reviewDate: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      return ctx.prisma.consentRecord.create({
        data: { ...input, organisationId, createdBy: userId, updatedBy: userId },
      });
    }),

  // ─────────────────────────────────────────
  // SERVICE AGREEMENTS
  // ─────────────────────────────────────────

  listServiceAgreements: protectedProcedure
    .input(z.object({ serviceUserId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.serviceAgreement.findMany({
        where: { serviceUserId: input.serviceUserId, organisationId },
        orderBy: { startDate: "desc" },
      });
    }),

  createServiceAgreement: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        servicesDescription: z.string().optional(),
        visitFrequency: z.string().optional(),
        visitDurationMinutes: z.number().optional(),
        costPerVisit: z.number().optional(),
        costPerHour: z.number().optional(),
        weeklyCost: z.number().optional(),
        paymentTerms: z.string().optional(),
        noticePeriodDays: z.number().optional(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date().optional(),
        signedByServiceUser: z.boolean().default(false),
        signedByRepresentative: z.string().optional(),
        signedByProvider: z.boolean().default(false),
        agreementDate: z.coerce.date().optional(),
        inspectionReportProvided: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      return ctx.prisma.serviceAgreement.create({
        data: { ...input, organisationId, createdBy: userId, updatedBy: userId },
      });
    }),

  // ─────────────────────────────────────────
  // HEALTH RECORDS
  // ─────────────────────────────────────────

  listHealthRecords: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        recordType: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.healthRecord.findMany({
        where: {
          serviceUserId: input.serviceUserId,
          organisationId,
          ...(input.recordType && { recordType: input.recordType as never }),
        },
        orderBy: { recordedDate: "desc" },
      });
    }),

  createHealthRecord: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        recordType: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        severity: z.string().optional(),
        recordedDate: z.coerce.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      return ctx.prisma.healthRecord.create({
        data: {
          ...input,
          recordType: input.recordType as never,
          severity: input.severity as never,
          organisationId,
          recordedBy: userId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }),

  updateServiceAgreement: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        servicesDescription: z.string().optional(),
        visitFrequency: z.string().optional(),
        visitDurationMinutes: z.number().optional(),
        costPerVisit: z.number().optional(),
        costPerHour: z.number().optional(),
        weeklyCost: z.number().optional(),
        paymentTerms: z.string().optional(),
        noticePeriodDays: z.number().optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        signedByServiceUser: z.boolean().optional(),
        signedByRepresentative: z.string().optional(),
        signedByProvider: z.boolean().optional(),
        agreementDate: z.coerce.date().optional(),
        inspectionReportProvided: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      const { id, ...data } = input;
      await ctx.prisma.serviceAgreement.findUniqueOrThrow({
        where: { id, organisationId },
      });
      return ctx.prisma.serviceAgreement.update({
        where: { id },
        data: { ...data, updatedBy: userId },
      });
    }),

  updateHealthRecord: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        severity: z.string().optional(),
        recordedDate: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      const { id, ...data } = input;
      await ctx.prisma.healthRecord.findUniqueOrThrow({
        where: { id, organisationId },
      });
      return ctx.prisma.healthRecord.update({
        where: { id },
        data: {
          ...data,
          severity: data.severity as never,
          updatedBy: userId,
        },
      });
    }),

  // ─────────────────────────────────────────
  // CARE VISIT RECORDS
  // ─────────────────────────────────────────

  listCareVisits: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      const skip = (input.page - 1) * input.limit;
      const where = {
        serviceUserId: input.serviceUserId,
        organisationId,
        ...(input.from || input.to
          ? { visitDate: { ...(input.from && { gte: input.from }), ...(input.to && { lte: input.to }) } }
          : {}),
      };
      const [items, total] = await Promise.all([
        ctx.prisma.careVisitRecord.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { visitDate: "desc" },
          include: {
            staffMember: { select: { id: true, firstName: true, lastName: true } },
          },
        }),
        ctx.prisma.careVisitRecord.count({ where }),
      ]);
      return { items, total, page: input.page, limit: input.limit };
    }),

  createCareVisit: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        staffMemberId: z.string().min(1).optional(),
        visitDate: z.coerce.date(),
        scheduledStart: z.string(), // "HH:MM"
        scheduledEnd: z.string(),
        actualStart: z.string().optional(),
        actualEnd: z.string().optional(),
        tasksCompleted: z
          .array(
            z.object({
              task: z.string(),
              completed: z.boolean(),
              notes: z.string().optional(),
            })
          )
          .optional(),
        wellbeingObservations: z.string().optional(),
        refusedCare: z.boolean().default(false),
        refusedCareDetails: z.string().optional(),
        familyCommunication: z.string().optional(),
        conditionChanges: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };

      // Resolve staff member: use provided or look up from current user
      let staffMemberId = input.staffMemberId;
      if (!staffMemberId) {
        const user = await ctx.prisma.user.findUnique({
          where: { id: userId },
          select: { staffMemberId: true },
        });
        if (!user?.staffMemberId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No staff member record linked to your account. Contact a manager.",
          });
        }
        staffMemberId = user.staffMemberId;
      }

      // Build datetime from visit date + time string
      const makeDateTime = (dateBase: Date, timeStr: string) => {
        const [h, m] = timeStr.split(":").map(Number);
        const dt = new Date(dateBase);
        dt.setHours(h, m, 0, 0);
        return dt;
      };

      return ctx.prisma.careVisitRecord.create({
        data: {
          serviceUserId: input.serviceUserId,
          staffMemberId,
          organisationId,
          visitDate: input.visitDate,
          scheduledStart: makeDateTime(input.visitDate, input.scheduledStart),
          scheduledEnd: makeDateTime(input.visitDate, input.scheduledEnd),
          actualStart: input.actualStart
            ? makeDateTime(input.visitDate, input.actualStart)
            : undefined,
          actualEnd: input.actualEnd
            ? makeDateTime(input.visitDate, input.actualEnd)
            : undefined,
          tasksCompleted: input.tasksCompleted ?? undefined,
          wellbeingObservations: input.wellbeingObservations,
          refusedCare: input.refusedCare,
          refusedCareDetails: input.refusedCareDetails,
          familyCommunication: input.familyCommunication,
          conditionChanges: input.conditionChanges,
          notes: input.notes,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }),

  updateCareVisit: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        wellbeingObservations: z.string().optional(),
        refusedCare: z.boolean().optional(),
        refusedCareDetails: z.string().optional(),
        familyCommunication: z.string().optional(),
        conditionChanges: z.string().optional(),
        notes: z.string().optional(),
        tasksCompleted: z
          .array(z.object({ task: z.string(), completed: z.boolean(), notes: z.string().optional() }))
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId, role } = ctx.user as {
        id: string;
        organisationId: string;
        role: string;
      };

      const visit = await ctx.prisma.careVisitRecord.findUniqueOrThrow({
        where: { id: input.id },
        select: { createdAt: true, organisationId: true },
      });

      const hoursSinceCreation =
        (Date.now() - visit.createdAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCreation > 48 && !MANAGER_ROLES.includes(role as never)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Care visit records are locked 48 hours after creation. Manager approval required.",
        });
      }

      if (hoursSinceCreation > 48) {
        // Audit manager override
        await createAuditLog({
          organisationId: visit.organisationId,
          userId,
          entityType: "care_visit_record",
          entityId: input.id,
          action: "UPDATE",
          changes: { _note: { old: "locked_record", new: "manager_override" } },
        });
      }

      const { id, ...data } = input;
      return ctx.prisma.careVisitRecord.update({
        where: { id },
        data: { ...data, updatedBy: userId },
      });
    }),

  // ─────────────────────────────────────────
  // SERVICE USER REVIEWS
  // ─────────────────────────────────────────

  listReviews: protectedProcedure
    .input(z.object({ serviceUserId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.serviceUserReview.findMany({
        where: { serviceUserId: input.serviceUserId, organisationId },
        orderBy: { reviewDate: "desc" },
        include: {
          reviewer: { select: { name: true, email: true } },
        },
      });
    }),

  createReview: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        reviewDate: z.coerce.date(),
        reviewType: z.enum(["SCHEDULED", "NEEDS_CHANGE", "ANNUAL"]),
        serviceUserFeedback: z.string().optional(),
        familyFeedback: z.string().optional(),
        changesIdentified: z.string().optional(),
        actionsTaken: z.string().optional(),
        mdtMeetingNotes: z.string().optional(),
        nextReviewDate: z.coerce.date().optional(),
        personalPlanUpdated: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      return ctx.prisma.serviceUserReview.create({
        data: {
          ...input,
          organisationId,
          reviewerId: userId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }),

  updateReview: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        reviewDate: z.coerce.date().optional(),
        reviewType: z.enum(["SCHEDULED", "NEEDS_CHANGE", "ANNUAL"]).optional(),
        serviceUserFeedback: z.string().optional(),
        familyFeedback: z.string().optional(),
        changesIdentified: z.string().optional(),
        actionsTaken: z.string().optional(),
        mdtMeetingNotes: z.string().optional(),
        nextReviewDate: z.coerce.date().optional(),
        personalPlanUpdated: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      const { id, ...data } = input;
      await ctx.prisma.serviceUserReview.findUniqueOrThrow({
        where: { id, organisationId },
      });
      return ctx.prisma.serviceUserReview.update({
        where: { id },
        data: { ...data, updatedBy: userId },
      });
    }),

  /** Legacy alias kept for compatibility */
  getVisits: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.careVisitRecord.findMany({
        where: { serviceUserId: input.serviceUserId, organisationId },
        take: input.limit,
        skip: (input.page - 1) * input.limit,
        orderBy: { visitDate: "desc" },
        include: { staffMember: { select: { id: true, firstName: true, lastName: true } } },
      });
    }),

  // ─────────────────────────────────────────
  // CHI NUMBER DUPLICATE CHECK
  // ─────────────────────────────────────────

  checkChiNumber: protectedProcedure
    .input(
      z.object({
        chiNumber: z.string().min(1),
        excludeId: z.string().min(1).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      const existing = await ctx.prisma.serviceUser.findFirst({
        where: {
          organisationId,
          chiNumber: input.chiNumber,
          ...(input.excludeId && { NOT: { id: input.excludeId } }),
        },
        select: { firstName: true, lastName: true },
      });
      if (!existing) return { duplicate: false as const };
      return {
        duplicate: true as const,
        existingName: `${existing.firstName} ${existing.lastName}`,
      };
    }),

  // ─────────────────────────────────────────
  // HEALTH RECORD DELETE
  // ─────────────────────────────────────────

  deleteHealthRecord: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      await ctx.prisma.healthRecord.findUniqueOrThrow({
        where: { id: input.id, organisationId },
      });
      return ctx.prisma.healthRecord.delete({ where: { id: input.id } });
    }),

  // ─────────────────────────────────────────
  // CONSENT RECORD UPDATE / DELETE
  // ─────────────────────────────────────────

  updateConsentRecord: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        signedBy: z.string().optional(),
        relationshipToServiceUser: z.string().optional(),
        consentDate: z.coerce.date().optional(),
        reviewDate: z.coerce.date().optional(),
        capacityAssessed: z.boolean().optional(),
        capacityOutcome: z.string().optional(),
        awiDocumentation: z.string().optional(),
        bestInterestDecision: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      const { id, ...data } = input;
      await ctx.prisma.consentRecord.findUniqueOrThrow({
        where: { id, organisationId },
      });
      return ctx.prisma.consentRecord.update({
        where: { id },
        data: { ...data, updatedBy: userId },
      });
    }),

  deleteConsentRecord: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      await ctx.prisma.consentRecord.findUniqueOrThrow({
        where: { id: input.id, organisationId },
      });
      return ctx.prisma.consentRecord.delete({ where: { id: input.id } });
    }),

  // ─────────────────────────────────────────
  // ASSIGNED STAFF (KEY WORKER / REGULAR CARER)
  // ─────────────────────────────────────────

  listAssignedStaff: protectedProcedure
    .input(z.object({ serviceUserId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.serviceUserStaff.findMany({
        where: { serviceUserId: input.serviceUserId, organisationId },
        orderBy: { createdAt: "asc" },
        include: {
          staffMember: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              jobTitle: true,
              roleType: true,
              status: true,
            },
          },
        },
      });
    }),

  assignStaff: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        staffMemberId: z.string().min(1),
        role: z.enum(["KEY_WORKER", "REGULAR_CARER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      await ctx.prisma.staffMember.findUniqueOrThrow({
        where: { id: input.staffMemberId, organisationId },
      });
      return ctx.prisma.serviceUserStaff.upsert({
        where: {
          serviceUserId_staffMemberId: {
            serviceUserId: input.serviceUserId,
            staffMemberId: input.staffMemberId,
          },
        },
        update: { role: input.role as StaffAssignmentRole },
        create: {
          serviceUserId: input.serviceUserId,
          staffMemberId: input.staffMemberId,
          organisationId,
          role: input.role as StaffAssignmentRole,
          createdBy: userId,
        },
      });
    }),

  removeStaffAssignment: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      await ctx.prisma.serviceUserStaff.findUniqueOrThrow({
        where: { id: input.id, organisationId },
      });
      return ctx.prisma.serviceUserStaff.delete({ where: { id: input.id } });
    }),

  // ─────────────────────────────────────────
  // SHARED HEALTHCARE PROFESSIONAL DIRECTORY
  // ─────────────────────────────────────────

  listSharedHCPs: protectedProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.sharedHealthcareProfessional.findMany({
        where: {
          organisationId,
          ...(input.search && {
            OR: [
              { professionalName: { contains: input.search, mode: "insensitive" as const } },
              { role: { contains: input.search, mode: "insensitive" as const } },
              { organisation: { contains: input.search, mode: "insensitive" as const } },
            ],
          }),
        },
        orderBy: { professionalName: "asc" },
      });
    }),

  createSharedHCP: protectedProcedure
    .input(
      z.object({
        professionalName: z.string().min(1),
        role: z.string().optional(),
        organisation: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      return ctx.prisma.sharedHealthcareProfessional.create({
        data: { ...input, email: input.email || undefined, organisationId, createdBy: userId },
      });
    }),

  updateSharedHCP: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        professionalName: z.string().min(1).optional(),
        role: z.string().optional(),
        organisation: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      const { id, email, ...rest } = input;
      await ctx.prisma.sharedHealthcareProfessional.findUniqueOrThrow({
        where: { id, organisationId },
      });
      return ctx.prisma.sharedHealthcareProfessional.update({
        where: { id },
        data: { ...rest, email: email || undefined },
      });
    }),

  listHealthcareProfessionals: protectedProcedure
    .input(z.object({ serviceUserId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.serviceUserHealthcareProfessional.findMany({
        where: { serviceUserId: input.serviceUserId, organisationId },
        orderBy: { createdAt: "asc" },
        include: { sharedHcp: true },
      });
    }),

  linkHCP: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        sharedHcpId: z.string().optional(),
        professionalName: z.string().min(1).optional(),
        role: z.string().optional(),
        organisation: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };

      let fields: {
        professionalName: string;
        role?: string;
        organisation?: string;
        phone?: string;
        email?: string;
      };

      if (input.sharedHcpId) {
        const shared = await ctx.prisma.sharedHealthcareProfessional.findUniqueOrThrow({
          where: { id: input.sharedHcpId, organisationId },
        });
        fields = {
          professionalName: shared.professionalName,
          role: shared.role ?? undefined,
          organisation: shared.organisation ?? undefined,
          phone: shared.phone ?? undefined,
          email: shared.email ?? undefined,
        };
      } else {
        if (!input.professionalName) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "professionalName is required" });
        }
        fields = {
          professionalName: input.professionalName,
          role: input.role,
          organisation: input.organisation,
          phone: input.phone,
          email: input.email || undefined,
        };
      }

      return ctx.prisma.serviceUserHealthcareProfessional.create({
        data: {
          serviceUserId: input.serviceUserId,
          organisationId,
          sharedHcpId: input.sharedHcpId ?? null,
          notes: input.notes,
          createdBy: userId,
          updatedBy: userId,
          ...fields,
        },
      });
    }),

  // ─────────────────────────────────────────
  // CLIENT TIMELINE
  // ─────────────────────────────────────────

  getTimeline: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      const { serviceUserId } = input;

      const [
        careVisits,
        personalPlans,
        riskAssessments,
        consentRecords,
        reviews,
        healthRecords,
        incidents,
      ] = await Promise.all([
        ctx.prisma.careVisitRecord.findMany({
          where: { serviceUserId, organisationId },
          take: 100,
          orderBy: { visitDate: "desc" },
          include: { staffMember: { select: { firstName: true, lastName: true } } },
        }),
        ctx.prisma.personalPlan.findMany({
          where: { serviceUserId, organisationId },
          take: 100,
          orderBy: { createdAt: "desc" },
        }),
        ctx.prisma.riskAssessment.findMany({
          where: { serviceUserId, organisationId },
          take: 100,
          orderBy: { assessmentDate: "desc" },
        }),
        ctx.prisma.consentRecord.findMany({
          where: { serviceUserId, organisationId },
          take: 100,
          orderBy: { consentDate: "desc" },
        }),
        ctx.prisma.serviceUserReview.findMany({
          where: { serviceUserId, organisationId },
          take: 100,
          orderBy: { reviewDate: "desc" },
        }),
        ctx.prisma.healthRecord.findMany({
          where: { serviceUserId, organisationId },
          take: 100,
          orderBy: { recordedDate: "desc" },
        }),
        ctx.prisma.incident.findMany({
          where: { serviceUserId, organisationId },
          take: 100,
          orderBy: { incidentDate: "desc" },
        }),
      ]);

      type TimelineEvent = {
        id: string;
        type: string;
        date: Date;
        title: string;
        subtitle?: string;
        href: string;
      };

      const events: TimelineEvent[] = [
        ...careVisits.map((v) => ({
          id: v.id,
          type: "CARE_VISIT",
          date: v.visitDate,
          title: `Care visit${v.staffMember ? ` — ${v.staffMember.firstName} ${v.staffMember.lastName}` : ""}`,
          href: "/care-records",
        })),
        ...personalPlans.map((p) => ({
          id: p.id,
          type: "PERSONAL_PLAN",
          date: p.createdAt,
          title: `Personal plan v${p.planVersion}`,
          subtitle: p.status,
          href: "/personal-plan",
        })),
        ...riskAssessments.map((r) => ({
          id: r.id,
          type: "RISK_ASSESSMENT",
          date: r.assessmentDate,
          title: `${r.assessmentType.replace(/_/g, " ")} risk assessment — ${r.riskLevel}`,
          href: "/risk-assessments",
        })),
        ...consentRecords.map((c) => ({
          id: c.id,
          type: "CONSENT",
          date: c.consentDate,
          title: `Consent ${c.consentType.replace(/_/g, " ")}: ${c.consentGiven ? "given" : "withheld"}`,
          href: "/consent",
        })),
        ...reviews.map((r) => ({
          id: r.id,
          type: "REVIEW",
          date: r.reviewDate,
          title: `${r.reviewType} review`,
          href: "/reviews",
        })),
        ...healthRecords.map((h) => ({
          id: h.id,
          type: "HEALTH_RECORD",
          date: h.recordedDate,
          title: h.title,
          subtitle: h.recordType.replace(/_/g, " "),
          href: "/health",
        })),
        ...incidents.map((i) => ({
          id: i.id,
          type: "INCIDENT",
          date: i.incidentDate,
          title: `${i.incidentType.replace(/_/g, " ")} incident`,
          subtitle: i.severity,
          href: "/incidents",
        })),
      ];

      events.sort((a, b) => b.date.getTime() - a.date.getTime());

      const total = events.length;
      const page = events.slice(input.offset, input.offset + input.limit);

      return { events: page, total };
    }),

  // ─────────────────────────────────────────
  // PENDING ACTIONS (compliance queue)
  // ─────────────────────────────────────────

  getPendingActions: protectedProcedure.query(async ({ ctx }) => {
    const { organisationId } = ctx.user as { organisationId: string };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const twelveMonthsAgo = new Date(today);
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    const REQUIRED_CONSENT_TYPES = [
      "CARE_AND_SUPPORT",
      "INFORMATION_SHARING",
      "MEDICATION",
    ] as ConsentType[];

    const [plansRaw, reviewsRaw, riskRaw, agreementsRaw, expiredConsentsRaw, activeClients] =
      await Promise.all([
        ctx.prisma.personalPlan.findMany({
          where: { organisationId, status: "DRAFT", serviceUser: { status: "ACTIVE" } },
          select: {
            id: true,
            planVersion: true,
            createdAt: true,
            serviceUserId: true,
            serviceUser: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "asc" },
        }),
        ctx.prisma.serviceUserReview.findMany({
          where: {
            organisationId,
            nextReviewDate: { lt: today },
            serviceUser: { status: "ACTIVE" },
          },
          select: {
            id: true,
            reviewDate: true,
            nextReviewDate: true,
            reviewType: true,
            serviceUserId: true,
            serviceUser: { select: { firstName: true, lastName: true } },
          },
          orderBy: { reviewDate: "desc" },
        }),
        ctx.prisma.riskAssessment.findMany({
          where: {
            organisationId,
            status: "ACTIVE",
            nextReviewDate: { lt: today },
            serviceUser: { status: "ACTIVE" },
          },
          select: {
            id: true,
            assessmentType: true,
            nextReviewDate: true,
            serviceUserId: true,
            serviceUser: { select: { firstName: true, lastName: true } },
          },
          orderBy: { nextReviewDate: "asc" },
        }),
        ctx.prisma.serviceAgreement.findMany({
          where: {
            organisationId,
            endDate: { gte: today, lte: thirtyDaysLater },
            serviceUser: { status: "ACTIVE" },
          },
          select: {
            id: true,
            endDate: true,
            serviceUserId: true,
            serviceUser: { select: { firstName: true, lastName: true } },
          },
          orderBy: { endDate: "asc" },
        }),
        ctx.prisma.consentRecord.findMany({
          where: {
            organisationId,
            consentDate: { lt: twelveMonthsAgo },
            serviceUser: { status: "ACTIVE" },
          },
          select: {
            id: true,
            consentType: true,
            consentDate: true,
            serviceUserId: true,
            serviceUser: { select: { firstName: true, lastName: true } },
          },
          orderBy: { consentDate: "asc" },
        }),
        ctx.prisma.serviceUser.findMany({
          where: { organisationId, status: "ACTIVE" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            consentRecords: { select: { consentType: true } },
          },
        }),
      ]);

    // Deduplicate reviews — one per client, keeping the most recent review date
    const reviewMap = new Map<string, (typeof reviewsRaw)[0]>();
    for (const r of reviewsRaw) {
      if (!reviewMap.has(r.serviceUserId)) reviewMap.set(r.serviceUserId, r);
    }
    const overdueReviews = Array.from(reviewMap.values());

    const missingConsents = activeClients.flatMap((client) => {
      const given = new Set(client.consentRecords.map((c) => c.consentType));
      const missingTypes = REQUIRED_CONSENT_TYPES.filter((t) => !given.has(t));
      return missingTypes.length > 0
        ? [{ clientId: client.id, clientName: `${client.firstName} ${client.lastName}`, missingTypes }]
        : [];
    });

    return {
      plansAwaitingApproval: plansRaw.map((p) => ({
        id: p.id,
        planVersion: p.planVersion,
        createdAt: p.createdAt,
        clientId: p.serviceUserId,
        clientName: `${p.serviceUser.firstName} ${p.serviceUser.lastName}`,
        href: `/clients/${p.serviceUserId}/personal-plan`,
      })),
      overdueReviews: overdueReviews.map((r) => ({
        id: r.id,
        nextReviewDate: r.nextReviewDate!,
        reviewType: r.reviewType,
        clientId: r.serviceUserId,
        clientName: `${r.serviceUser.firstName} ${r.serviceUser.lastName}`,
        href: `/clients/${r.serviceUserId}/reviews`,
      })),
      overdueRiskAssessments: riskRaw.map((r) => ({
        id: r.id,
        assessmentType: r.assessmentType,
        nextReviewDate: r.nextReviewDate!,
        clientId: r.serviceUserId,
        clientName: `${r.serviceUser.firstName} ${r.serviceUser.lastName}`,
        href: `/clients/${r.serviceUserId}/risk-assessments`,
      })),
      expiringSoon: agreementsRaw.map((a) => ({
        id: a.id,
        endDate: a.endDate!,
        clientId: a.serviceUserId,
        clientName: `${a.serviceUser.firstName} ${a.serviceUser.lastName}`,
        href: `/clients/${a.serviceUserId}/agreement`,
      })),
      expiredConsents: expiredConsentsRaw.map((c) => ({
        id: c.id,
        consentType: c.consentType,
        consentDate: c.consentDate,
        clientId: c.serviceUserId,
        clientName: `${c.serviceUser.firstName} ${c.serviceUser.lastName}`,
        href: `/clients/${c.serviceUserId}/consent`,
      })),
      missingConsents,
    };
  }),
});

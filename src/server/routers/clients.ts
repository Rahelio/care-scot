import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { ServiceUserStatus, RiskAssessmentType, RiskLevel, ConsentType } from "@prisma/client";
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

  /** Minimal fetch for profile layout header */
  getProfile: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
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
    .input(z.object({ id: z.string().uuid() }))
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
      return ctx.prisma.serviceUser.create({
        data: { ...data, organisationId, createdBy: userId, updatedBy: userId },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
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
        serviceUserId: z.string().uuid(),
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
        id: z.string().uuid(),
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
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.serviceUserContact.delete({ where: { id: input.id } });
    }),

  // ─────────────────────────────────────────
  // HEALTHCARE PROFESSIONALS
  // ─────────────────────────────────────────

  addHealthcareProfessional: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().uuid(),
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
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.serviceUserHealthcareProfessional.delete({
        where: { id: input.id },
      });
    }),

  // ─────────────────────────────────────────
  // PERSONAL PLANS
  // ─────────────────────────────────────────

  listPersonalPlans: protectedProcedure
    .input(z.object({ serviceUserId: z.string().uuid() }))
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
        serviceUserId: z.string().uuid(),
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

  approvePlan: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
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
        serviceUserId: z.string().uuid(),
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
        serviceUserId: z.string().uuid(),
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

  updateRiskAssessment: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
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
    .input(z.object({ serviceUserId: z.string().uuid() }))
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
        serviceUserId: z.string().uuid(),
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
    .input(z.object({ serviceUserId: z.string().uuid() }))
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
        serviceUserId: z.string().uuid(),
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
        serviceUserId: z.string().uuid(),
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
        serviceUserId: z.string().uuid(),
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

  // ─────────────────────────────────────────
  // CARE VISIT RECORDS
  // ─────────────────────────────────────────

  listCareVisits: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().uuid(),
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
        serviceUserId: z.string().uuid(),
        staffMemberId: z.string().uuid().optional(),
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
        id: z.string().uuid(),
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
    .input(z.object({ serviceUserId: z.string().uuid() }))
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
        serviceUserId: z.string().uuid(),
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

  /** Legacy alias kept for compatibility */
  getVisits: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().uuid(),
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
});

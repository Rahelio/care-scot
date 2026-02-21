import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  PolicyStatus,
  PolicyCategory,
  ComplaintStatus,
  QualityAuditType,
  AuditStatus,
  SurveyType,
  AnnualReturnStatus,
} from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { requirePermission } from "../middleware/rbac";

const manageProcedure = protectedProcedure.use(
  requirePermission("audits.manage")
);

// ─── Shared schemas ──────────────────────────────────────────────────────────

const findingSchema = z.object({
  id: z.string(),
  section: z.string(),
  item: z.string(),
  result: z.enum(["PASS", "FAIL", "NA"]),
  notes: z.string().optional(),
});

const actionItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED"]),
});

const requirementSchema = z.object({
  id: z.string(),
  description: z.string(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED"]),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

// ─── SLA helper — 20 working days from dateReceived ─────────────────────────

function addWorkingDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const complianceRouter = router({
  // ══════════════════════════════════════════════════════════════════════════
  // POLICIES
  // ══════════════════════════════════════════════════════════════════════════

  policies: router({
    list: protectedProcedure
      .input(
        z.object({
          status: z.nativeEnum(PolicyStatus).optional(),
          category: z.nativeEnum(PolicyCategory).optional(),
          search: z.string().optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(50),
        })
      )
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        const skip = (input.page - 1) * input.limit;
        const where = {
          organisationId,
          ...(input.status && { status: input.status }),
          ...(input.category && { policyCategory: input.category }),
          ...(input.search && {
            policyName: {
              contains: input.search,
              mode: "insensitive" as const,
            },
          }),
        };
        const [items, total] = await Promise.all([
          ctx.prisma.policy.findMany({
            where,
            skip,
            take: input.limit,
            orderBy: [{ policyCategory: "asc" }, { policyName: "asc" }],
            include: {
              _count: { select: { acknowledgments: true } },
            },
          }),
          ctx.prisma.policy.count({ where }),
        ]);
        return { items, total, page: input.page, limit: input.limit };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        const policy = await ctx.prisma.policy.findUnique({
          where: { id: input.id, organisationId },
          include: {
            approvedByUser: { select: { id: true, email: true } },
            acknowledgments: {
              include: {
                policy: false,
              },
            },
          },
        });
        if (!policy) throw new TRPCError({ code: "NOT_FOUND" });
        return policy;
      }),

    create: manageProcedure
      .input(
        z.object({
          policyName: z.string().min(1),
          policyCategory: z.nativeEnum(PolicyCategory),
          status: z.nativeEnum(PolicyStatus).optional(),
          effectiveDate: z.string().optional(),
          reviewDate: z.string().optional(),
          nextReviewDate: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as {
          organisationId: string;
          id: string;
        };
        const { effectiveDate, reviewDate, nextReviewDate, ...rest } = input;
        return ctx.prisma.policy.create({
          data: {
            ...rest,
            effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
            reviewDate: reviewDate ? new Date(reviewDate) : undefined,
            nextReviewDate: nextReviewDate
              ? new Date(nextReviewDate)
              : undefined,
            organisationId,
            version: 1,
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }),

    /**
     * Update a policy. If publishing a new version, archives the old one
     * and creates a new record with version + 1.
     */
    update: manageProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          policyName: z.string().min(1).optional(),
          policyCategory: z.nativeEnum(PolicyCategory).optional(),
          status: z.nativeEnum(PolicyStatus).optional(),
          effectiveDate: z.string().optional(),
          reviewDate: z.string().optional(),
          nextReviewDate: z.string().optional(),
          newVersion: z.boolean().optional(), // set true to create a new version
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as {
          organisationId: string;
          id: string;
        };
        const { id, newVersion, effectiveDate, reviewDate, nextReviewDate, ...data } =
          input;

        if (newVersion) {
          // Archive the old version
          const existing = await ctx.prisma.policy.findUniqueOrThrow({
            where: { id, organisationId },
          });
          await ctx.prisma.policy.update({
            where: { id },
            data: { status: "ARCHIVED", updatedBy: userId },
          });
          // Create new version
          return ctx.prisma.policy.create({
            data: {
              policyName: data.policyName ?? existing.policyName,
              policyCategory:
                data.policyCategory ?? existing.policyCategory,
              status: data.status ?? "DRAFT",
              effectiveDate: effectiveDate
                ? new Date(effectiveDate)
                : undefined,
              reviewDate: reviewDate ? new Date(reviewDate) : undefined,
              nextReviewDate: nextReviewDate
                ? new Date(nextReviewDate)
                : undefined,
              version: existing.version + 1,
              organisationId,
              createdBy: userId,
              updatedBy: userId,
            },
          });
        }

        return ctx.prisma.policy.update({
          where: { id, organisationId },
          data: {
            ...data,
            effectiveDate: effectiveDate
              ? new Date(effectiveDate)
              : undefined,
            reviewDate: reviewDate ? new Date(reviewDate) : undefined,
            nextReviewDate: nextReviewDate
              ? new Date(nextReviewDate)
              : undefined,
            approvedBy:
              data.status === "ACTIVE" ? userId : undefined,
            approvedDate:
              data.status === "ACTIVE" ? new Date() : undefined,
            updatedBy: userId,
          },
        });
      }),

    /** Staff member acknowledges a policy */
    acknowledge: protectedProcedure
      .input(z.object({ policyId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { staffMemberId } = ctx.user as {
          staffMemberId: string | null;
        };
        if (!staffMemberId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No staff member profile linked to your account.",
          });
        }

        // Upsert acknowledgment
        const existing = await ctx.prisma.policyAcknowledgment.findFirst({
          where: { policyId: input.policyId, staffMemberId },
        });

        if (existing) {
          return ctx.prisma.policyAcknowledgment.update({
            where: { id: existing.id },
            data: { acknowledged: true, acknowledgedDate: new Date() },
          });
        }

        return ctx.prisma.policyAcknowledgment.create({
          data: {
            policyId: input.policyId,
            staffMemberId,
            acknowledged: true,
            acknowledgedDate: new Date(),
          },
        });
      }),

    /** Get acknowledgment status: total staff + who has acknowledged */
    getAcknowledgmentStatus: protectedProcedure
      .input(z.object({ policyId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };

        const [totalStaff, acknowledgments] = await Promise.all([
          ctx.prisma.staffMember.count({
            where: { organisationId, status: "ACTIVE" },
          }),
          ctx.prisma.policyAcknowledgment.findMany({
            where: { policyId: input.policyId, acknowledged: true },
            select: {
              staffMemberId: true,
              acknowledgedDate: true,
            },
          }),
        ]);

        return {
          totalStaff,
          acknowledgedCount: acknowledgments.length,
          acknowledgments,
        };
      }),
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // COMPLAINTS
  // ══════════════════════════════════════════════════════════════════════════

  complaints: router({
    list: protectedProcedure
      .input(
        z.object({
          status: z.nativeEnum(ComplaintStatus).optional(),
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
              investigatedByUser: { select: { id: true, email: true } },
            },
          }),
          ctx.prisma.complaint.count({ where }),
        ]);

        // Enrich with SLA info
        const enriched = items.map((c) => {
          const slaDeadline = addWorkingDays(new Date(c.dateReceived), 20);
          const isOverdue =
            c.status !== "RESOLVED" && new Date() > slaDeadline;
          return { ...c, slaDeadline, isOverdue };
        });

        return {
          items: enriched,
          total,
          page: input.page,
          limit: input.limit,
        };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        const complaint = await ctx.prisma.complaint.findUnique({
          where: { id: input.id, organisationId },
          include: {
            serviceUser: {
              select: { id: true, firstName: true, lastName: true },
            },
            investigatedByUser: { select: { id: true, email: true } },
          },
        });
        if (!complaint) throw new TRPCError({ code: "NOT_FOUND" });
        const slaDeadline = addWorkingDays(
          new Date(complaint.dateReceived),
          20
        );
        const isOverdue =
          complaint.status !== "RESOLVED" && new Date() > slaDeadline;
        return { ...complaint, slaDeadline, isOverdue };
      }),

    create: protectedProcedure
      .input(
        z.object({
          dateReceived: z.string(), // "YYYY-MM-DD"
          complainantName: z.string().min(1),
          complainantRelationship: z.string().optional(),
          serviceUserId: z.string().uuid().optional(),
          natureOfComplaint: z.string().min(1, "Description is required"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as {
          organisationId: string;
          id: string;
        };
        const { dateReceived, ...rest } = input;
        return ctx.prisma.complaint.create({
          data: {
            ...rest,
            dateReceived: new Date(dateReceived),
            organisationId,
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }),

    update: manageProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          investigationCarriedOut: z.string().optional(),
          outcome: z.string().optional(),
          actionsTaken: z.array(z.string()).optional(),
          responseSentDate: z.string().optional(),
          responseMethod: z.string().optional(),
          referredToCareInspectorate: z.boolean().optional(),
          referralDate: z.string().optional(),
          satisfactionWithOutcome: z.string().optional(),
          lessonsLearned: z.string().optional(),
          status: z.nativeEnum(ComplaintStatus).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as {
          organisationId: string;
          id: string;
        };
        const {
          id,
          responseSentDate,
          referralDate,
          actionsTaken,
          ...data
        } = input;

        const updateData: Record<string, unknown> = {
          ...data,
          updatedBy: userId,
        };
        if (responseSentDate)
          updateData.responseSentDate = new Date(responseSentDate);
        if (referralDate) updateData.referralDate = new Date(referralDate);
        if (actionsTaken) updateData.actionsTaken = actionsTaken;
        if (data.status === "INVESTIGATING")
          updateData.investigatedBy = userId;
        if (data.status === "RESOLVED")
          updateData.closedDate = new Date();

        return ctx.prisma.complaint.update({
          where: { id, organisationId },
          data: updateData,
        });
      }),
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // COMPLIMENTS
  // ══════════════════════════════════════════════════════════════════════════

  compliments: router({
    list: protectedProcedure
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
          ctx.prisma.compliment.findMany({
            where: { organisationId },
            skip,
            take: input.limit,
            orderBy: { dateReceived: "desc" },
            include: {
              serviceUser: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          }),
          ctx.prisma.compliment.count({ where: { organisationId } }),
        ]);
        return { items, total, page: input.page, limit: input.limit };
      }),

    create: protectedProcedure
      .input(
        z.object({
          dateReceived: z.string(), // "YYYY-MM-DD"
          fromName: z.string().min(1),
          serviceUserId: z.string().uuid().optional(),
          complimentText: z.string().optional(),
          sharedWithStaff: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as {
          organisationId: string;
          id: string;
        };
        const { dateReceived, ...rest } = input;
        return ctx.prisma.compliment.create({
          data: {
            ...rest,
            dateReceived: new Date(dateReceived),
            organisationId,
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }),
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // QUALITY AUDITS
  // ══════════════════════════════════════════════════════════════════════════

  audits: router({
    list: manageProcedure
      .input(
        z.object({
          auditType: z.nativeEnum(QualityAuditType).optional(),
          status: z.nativeEnum(AuditStatus).optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(20),
        })
      )
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        const skip = (input.page - 1) * input.limit;
        const where = {
          organisationId,
          ...(input.auditType && { auditType: input.auditType }),
          ...(input.status && { status: input.status }),
        };
        const [items, total] = await Promise.all([
          ctx.prisma.qualityAudit.findMany({
            where,
            skip,
            take: input.limit,
            orderBy: { auditDate: "desc" },
            include: {
              auditor: { select: { id: true, email: true } },
            },
          }),
          ctx.prisma.qualityAudit.count({ where }),
        ]);
        return { items, total, page: input.page, limit: input.limit };
      }),

    getById: manageProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        const audit = await ctx.prisma.qualityAudit.findUnique({
          where: { id: input.id, organisationId },
          include: {
            auditor: { select: { id: true, email: true } },
          },
        });
        if (!audit) throw new TRPCError({ code: "NOT_FOUND" });
        return audit;
      }),

    create: manageProcedure
      .input(
        z.object({
          auditType: z.nativeEnum(QualityAuditType),
          auditDate: z.string(),
          findings: z.array(findingSchema).optional(),
          issues: z.string().optional(),
          recommendations: z.string().optional(),
          actionPlan: z.array(actionItemSchema).optional(),
          followUpDate: z.string().optional(),
          status: z.nativeEnum(AuditStatus).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as {
          organisationId: string;
          id: string;
        };
        const { auditDate, followUpDate, findings, actionPlan, ...rest } =
          input;
        return ctx.prisma.qualityAudit.create({
          data: {
            ...rest,
            auditDate: new Date(auditDate),
            followUpDate: followUpDate ? new Date(followUpDate) : undefined,
            findings: findings ?? undefined,
            actionPlan: actionPlan ?? undefined,
            organisationId,
            auditorId: userId,
            status: rest.status ?? "OPEN",
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }),

    update: manageProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          findings: z.array(findingSchema).optional(),
          issues: z.string().optional(),
          recommendations: z.string().optional(),
          actionPlan: z.array(actionItemSchema).optional(),
          followUpDate: z.string().optional(),
          status: z.nativeEnum(AuditStatus).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as {
          organisationId: string;
          id: string;
        };
        const { id, followUpDate, findings, actionPlan, ...data } = input;
        return ctx.prisma.qualityAudit.update({
          where: { id, organisationId },
          data: {
            ...data,
            followUpDate: followUpDate ? new Date(followUpDate) : undefined,
            findings: findings ?? undefined,
            actionPlan: actionPlan ?? undefined,
            updatedBy: userId,
          },
        });
      }),
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // SURVEYS
  // ══════════════════════════════════════════════════════════════════════════

  surveys: router({
    list: protectedProcedure
      .input(
        z.object({
          surveyType: z.nativeEnum(SurveyType).optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(20),
        })
      )
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        const skip = (input.page - 1) * input.limit;
        const where = {
          organisationId,
          ...(input.surveyType && { surveyType: input.surveyType }),
        };
        const [items, total] = await Promise.all([
          ctx.prisma.satisfactionSurvey.findMany({
            where,
            skip,
            take: input.limit,
            orderBy: { surveyDate: "desc" },
            include: {
              serviceUser: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          }),
          ctx.prisma.satisfactionSurvey.count({ where }),
        ]);
        return { items, total, page: input.page, limit: input.limit };
      }),

    create: protectedProcedure
      .input(
        z.object({
          surveyDate: z.string(),
          surveyType: z.nativeEnum(SurveyType),
          serviceUserId: z.string().uuid().optional(),
          overallRating: z.string().optional(), // parse to int in handler
          comments: z.string().optional(),
          actionsFromFeedback: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as {
          organisationId: string;
          id: string;
        };
        const { surveyDate, overallRating, ...rest } = input;
        return ctx.prisma.satisfactionSurvey.create({
          data: {
            ...rest,
            surveyDate: new Date(surveyDate),
            overallRating: overallRating
              ? parseInt(overallRating, 10)
              : undefined,
            organisationId,
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }),

    getSummary: protectedProcedure.query(async ({ ctx }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      const surveys = await ctx.prisma.satisfactionSurvey.findMany({
        where: { organisationId },
        select: { surveyType: true, overallRating: true },
      });

      const totalCount = surveys.length;
      const rated = surveys.filter((s) => s.overallRating !== null);
      const averageRating =
        rated.length > 0
          ? rated.reduce((sum, s) => sum + (s.overallRating ?? 0), 0) /
            rated.length
          : null;

      const byType: Record<string, { count: number; avgRating: number | null }> =
        {};
      for (const type of ["SERVICE_USER", "FAMILY", "STAFF"] as const) {
        const typeItems = surveys.filter((s) => s.surveyType === type);
        const typeRated = typeItems.filter((s) => s.overallRating !== null);
        byType[type] = {
          count: typeItems.length,
          avgRating:
            typeRated.length > 0
              ? typeRated.reduce((sum, s) => sum + (s.overallRating ?? 0), 0) /
                typeRated.length
              : null,
        };
      }

      return { totalCount, averageRating, byType };
    }),
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // INSPECTIONS
  // ══════════════════════════════════════════════════════════════════════════

  inspections: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.careInspectorateInspection.findMany({
        where: { organisationId },
        orderBy: { inspectionDate: "desc" },
        include: {
          actionPlan: { select: { id: true, status: true } },
        },
      });
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        const inspection =
          await ctx.prisma.careInspectorateInspection.findUnique({
            where: { id: input.id, organisationId },
            include: {
              actionPlan: {
                include: {
                  auditor: { select: { id: true, email: true } },
                },
              },
            },
          });
        if (!inspection) throw new TRPCError({ code: "NOT_FOUND" });
        return inspection;
      }),

    create: manageProcedure
      .input(
        z.object({
          inspectionDate: z.string(),
          inspectorName: z.string().optional(),
          grades: z
            .record(z.string(), z.number().min(1).max(6))
            .optional(),
          reportSummary: z.string().optional(),
          requirements: z.array(requirementSchema).optional(),
          recommendations: z.array(requirementSchema).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as {
          organisationId: string;
          id: string;
        };
        const { inspectionDate, grades, requirements, recommendations, ...rest } =
          input;
        return ctx.prisma.careInspectorateInspection.create({
          data: {
            ...rest,
            inspectionDate: new Date(inspectionDate),
            grades: grades ?? undefined,
            requirements: requirements ?? undefined,
            recommendations: recommendations ?? undefined,
            organisationId,
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }),

    update: manageProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          inspectorName: z.string().optional(),
          grades: z.record(z.string(), z.number().min(1).max(6)).optional(),
          reportSummary: z.string().optional(),
          requirements: z.array(requirementSchema).optional(),
          recommendations: z.array(requirementSchema).optional(),
          actionPlanId: z.string().uuid().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as {
          organisationId: string;
          id: string;
        };
        const { id, grades, requirements, recommendations, ...data } = input;
        return ctx.prisma.careInspectorateInspection.update({
          where: { id, organisationId },
          data: {
            ...data,
            grades: grades ?? undefined,
            requirements: requirements ?? undefined,
            recommendations: recommendations ?? undefined,
            updatedBy: userId,
          },
        });
      }),
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // ANNUAL RETURNS
  // ══════════════════════════════════════════════════════════════════════════

  annualReturns: router({
    list: manageProcedure.query(async ({ ctx }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.annualReturn.findMany({
        where: { organisationId },
        orderBy: { year: "desc" },
      });
    }),

    create: manageProcedure
      .input(
        z.object({
          year: z.number().int().min(2020).max(2100),
          deadlineDate: z.string().optional(),
          selfEvaluation: z.string().optional(),
          complaintsSummary: z.string().optional(),
          incidentsSummary: z.string().optional(),
          improvementsMade: z.string().optional(),
          plannedImprovements: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as {
          organisationId: string;
          id: string;
        };
        const { deadlineDate, ...rest } = input;
        return ctx.prisma.annualReturn.create({
          data: {
            ...rest,
            deadlineDate: deadlineDate ? new Date(deadlineDate) : undefined,
            organisationId,
            status: "DRAFT",
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }),

    update: manageProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          selfEvaluation: z.string().optional(),
          complaintsSummary: z.string().optional(),
          incidentsSummary: z.string().optional(),
          improvementsMade: z.string().optional(),
          plannedImprovements: z.string().optional(),
          serviceUserCount: z.number().int().optional(),
          staffCount: z.number().int().optional(),
          submissionDate: z.string().optional(),
          status: z.nativeEnum(AnnualReturnStatus).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as {
          organisationId: string;
          id: string;
        };
        const { id, submissionDate, ...data } = input;
        return ctx.prisma.annualReturn.update({
          where: { id, organisationId },
          data: {
            ...data,
            submissionDate: submissionDate
              ? new Date(submissionDate)
              : undefined,
            updatedBy: userId,
          },
        });
      }),

    /**
     * Auto-populate counts and summaries from live data.
     * Returns calculated data — the caller should then update the record.
     */
    autoPopulate: manageProcedure
      .input(z.object({ year: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        const yearStart = new Date(input.year, 0, 1);
        const yearEnd = new Date(input.year, 11, 31);

        const [serviceUserCount, staffCount, complaints, incidents] =
          await Promise.all([
            ctx.prisma.serviceUser.count({
              where: { organisationId, status: "ACTIVE" },
            }),
            ctx.prisma.staffMember.count({
              where: { organisationId, status: "ACTIVE" },
            }),
            ctx.prisma.complaint.findMany({
              where: {
                organisationId,
                dateReceived: { gte: yearStart, lte: yearEnd },
              },
              select: {
                status: true,
                natureOfComplaint: true,
              },
            }),
            ctx.prisma.incident.findMany({
              where: {
                organisationId,
                incidentDate: { gte: yearStart, lte: yearEnd },
              },
              select: {
                incidentType: true,
                severity: true,
                status: true,
              },
            }),
          ]);

        const complaintsSummary = `${complaints.length} complaint(s) received in ${input.year}. ${complaints.filter((c) => c.status === "RESOLVED").length} resolved, ${complaints.filter((c) => c.status !== "RESOLVED").length} open/in progress.`;

        const incidentsSummary = `${incidents.length} incident(s) recorded in ${input.year}. By severity: ${incidents.filter((i) => i.severity === "CRITICAL").length} critical, ${incidents.filter((i) => i.severity === "HIGH").length} high, ${incidents.filter((i) => i.severity === "MEDIUM").length} medium, ${incidents.filter((i) => i.severity === "LOW").length} low.`;

        return {
          serviceUserCount,
          staffCount,
          complaintsSummary,
          incidentsSummary,
        };
      }),
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD — Inspection Readiness
  // ══════════════════════════════════════════════════════════════════════════

  dashboard: router({
    getOverview: manageProcedure.query(async ({ ctx }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      const now = new Date();
      const days28Ago = new Date(now.getTime() - 28 * 86_400_000);
      const days90Future = new Date(now.getTime() + 90 * 86_400_000);
      const months3Ago = new Date(now);
      months3Ago.setMonth(months3Ago.getMonth() - 3);
      const months12Ago = new Date(now);
      months12Ago.setMonth(months12Ago.getMonth() - 12);

      // ── Personal Plans ──
      const activeServiceUsers = await ctx.prisma.serviceUser.findMany({
        where: { organisationId, status: "ACTIVE" },
        select: { id: true },
      });
      const suIds = activeServiceUsers.map((su) => su.id);
      const totalSU = suIds.length;

      // Find service users that have at least one ACTIVE personal plan
      const withPlanSUs = totalSU > 0
        ? await ctx.prisma.personalPlan.findMany({
            where: {
              organisationId,
              serviceUserId: { in: suIds },
              status: "ACTIVE",
            },
            select: { serviceUserId: true },
            distinct: ["serviceUserId"],
          })
        : [];
      const withPlanCount = withPlanSUs.length;
      const withoutPlanCount = totalSU - withPlanCount;

      // Overdue plans: ACTIVE plans where nextReviewDate < 28 days ago
      const overduePlans = totalSU > 0
        ? await ctx.prisma.personalPlan.count({
            where: {
              organisationId,
              status: "ACTIVE",
              nextReviewDate: { lt: days28Ago },
            },
          })
        : 0;

      // Due for review: ACTIVE plans where nextReviewDate <= now
      const dueForReview = totalSU > 0
        ? await ctx.prisma.personalPlan.count({
            where: {
              organisationId,
              status: "ACTIVE",
              nextReviewDate: { lte: now, gte: days28Ago },
            },
          })
        : 0;

      // ── Staff Compliance ──
      const activeStaff = await ctx.prisma.staffMember.findMany({
        where: { organisationId, status: "ACTIVE" },
        select: { id: true },
      });
      const staffIds = activeStaff.map((s) => s.id);
      const totalStaff = staffIds.length;

      // PVG expiring in 90 days
      const pvgExpiring = totalStaff > 0
        ? await ctx.prisma.staffPvgRecord.count({
            where: {
              organisationId,
              staffMemberId: { in: staffIds },
              renewalDate: { lte: days90Future, gte: now },
            },
          })
        : 0;

      // SSSC expiring in 90 days
      const ssscExpiring = totalStaff > 0
        ? await ctx.prisma.staffRegistration.count({
            where: {
              organisationId,
              staffMemberId: { in: staffIds },
              registrationType: "SSSC",
              expiryDate: { lte: days90Future, gte: now },
            },
          })
        : 0;

      // Staff missing mandatory training (active staff with no mandatory training records)
      const staffWithMandatory = totalStaff > 0
        ? await ctx.prisma.staffTrainingRecord.findMany({
            where: {
              organisationId,
              staffMemberId: { in: staffIds },
              isMandatory: true,
            },
            select: { staffMemberId: true },
            distinct: ["staffMemberId"],
          })
        : [];
      const missingMandatory = totalStaff - staffWithMandatory.length;

      // Expiring training (mandatory, expiring in 90 days)
      const expiringTraining = totalStaff > 0
        ? await ctx.prisma.staffTrainingRecord.count({
            where: {
              organisationId,
              staffMemberId: { in: staffIds },
              isMandatory: true,
              expiryDate: { lte: days90Future, gte: now },
            },
          })
        : 0;

      // Overdue supervisions (>3 months since last)
      const recentSupervisions = totalStaff > 0
        ? await ctx.prisma.staffSupervision.findMany({
            where: {
              organisationId,
              staffMemberId: { in: staffIds },
              supervisionDate: { gte: months3Ago },
            },
            select: { staffMemberId: true },
            distinct: ["staffMemberId"],
          })
        : [];
      const overdueSupervisions = totalStaff - recentSupervisions.length;

      // Overdue appraisals (>12 months since last)
      const recentAppraisals = totalStaff > 0
        ? await ctx.prisma.staffAppraisal.findMany({
            where: {
              organisationId,
              staffMemberId: { in: staffIds },
              appraisalDate: { gte: months12Ago },
            },
            select: { staffMemberId: true },
            distinct: ["staffMemberId"],
          })
        : [];
      const overdueAppraisals = totalStaff - recentAppraisals.length;

      // ── Incidents ──
      const [
        openIncidents,
        highCriticalOpen,
        pendingCINotifications,
        openSafeguarding,
      ] = await Promise.all([
        ctx.prisma.incident.count({
          where: { organisationId, status: { not: "CLOSED" } },
        }),
        ctx.prisma.incident.count({
          where: {
            organisationId,
            status: { not: "CLOSED" },
            severity: { in: ["HIGH", "CRITICAL"] },
          },
        }),
        ctx.prisma.careInspectorateNotification.count({
          where: { organisationId, submittedDate: null },
        }),
        ctx.prisma.safeguardingConcern.count({
          where: { organisationId, status: { not: "CLOSED" } },
        }),
      ]);

      // ── Complaints ──
      const openComplaints = await ctx.prisma.complaint.findMany({
        where: { organisationId, status: { not: "RESOLVED" } },
        select: { dateReceived: true },
      });
      const overdueComplaints = openComplaints.filter((c) => {
        const deadline = addWorkingDays(new Date(c.dateReceived), 20);
        return now > deadline;
      }).length;

      // ── Policies ──
      const overdueReviews = await ctx.prisma.policy.count({
        where: {
          organisationId,
          status: "ACTIVE",
          nextReviewDate: { lt: now },
        },
      });

      const activePolicies = await ctx.prisma.policy.findMany({
        where: { organisationId, status: "ACTIVE" },
        select: { id: true },
      });
      const policyIds = activePolicies.map((p) => p.id);

      // Total expected acknowledgments vs actual
      const totalExpectedAcks = policyIds.length * totalStaff;
      const actualAcks = policyIds.length > 0
        ? await ctx.prisma.policyAcknowledgment.count({
            where: {
              policyId: { in: policyIds },
              acknowledged: true,
            },
          })
        : 0;
      const pendingAcknowledgments = totalExpectedAcks - actualAcks;

      // ── Audits ──
      const openAudits = await ctx.prisma.qualityAudit.findMany({
        where: { organisationId, status: { not: "CLOSED" } },
        select: { auditType: true, actionPlan: true },
      });
      type AuditActionItem = { status: string };
      let openActionItems = 0;
      for (const a of openAudits) {
        const plan = (a.actionPlan as unknown as AuditActionItem[] | null) ?? [];
        openActionItems += plan.filter((p) => p.status !== "COMPLETED").length;
      }

      // ── Equipment ──
      const overdueEquipment = await ctx.prisma.equipmentCheck.count({
        where: {
          organisationId,
          nextCheckDate: { lt: now },
        },
      });

      // ── Reviews ──
      // Service users without a review in the last 12 months
      const recentReviews = totalSU > 0
        ? await ctx.prisma.serviceUserReview.findMany({
            where: {
              organisationId,
              serviceUserId: { in: suIds },
              reviewDate: { gte: months12Ago },
            },
            select: { serviceUserId: true },
            distinct: ["serviceUserId"],
          })
        : [];
      const overdueReviews2 = totalSU - recentReviews.length;

      return {
        personalPlans: {
          total: totalSU,
          withPlan: withPlanCount,
          withoutPlan: withoutPlanCount,
          overdue: overduePlans,
          dueForReview,
        },
        staffCompliance: {
          totalStaff,
          pvgExpiring,
          ssscExpiring,
          missingMandatory,
          expiringTraining,
          overdueSupervisions,
          overdueAppraisals,
        },
        incidents: {
          openCount: openIncidents,
          highCriticalOpen,
          pendingCINotifications,
          openSafeguarding,
        },
        complaints: {
          openCount: openComplaints.length,
          overdueResponses: overdueComplaints,
        },
        policies: {
          overdueReviews,
          pendingAcknowledgments,
          totalActivePolicies: policyIds.length,
        },
        audits: {
          openCount: openAudits.length,
          openActionItems,
        },
        equipment: {
          overdueChecks: overdueEquipment,
        },
        reviews: {
          overdueAnnualReviews: overdueReviews2,
          totalServiceUsers: totalSU,
        },
      };
    }),

    getInspectionReadinessScore: manageProcedure.query(async ({ ctx }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      const now = new Date();
      const days90Future = new Date(now.getTime() + 90 * 86_400_000);
      const months3Ago = new Date(now);
      months3Ago.setMonth(months3Ago.getMonth() - 3);
      const months12Ago = new Date(now);
      months12Ago.setMonth(months12Ago.getMonth() - 12);

      // Helper: clamp between 0-100
      const clamp = (v: number) => Math.max(0, Math.min(100, v));

      // ── Personal Plans (20%) ──
      const activeServiceUsers = await ctx.prisma.serviceUser.findMany({
        where: { organisationId, status: "ACTIVE" },
        select: { id: true },
      });
      const suIds = activeServiceUsers.map((su) => su.id);
      const totalSU = suIds.length;

      const withPlanSUs = totalSU > 0
        ? await ctx.prisma.personalPlan.findMany({
            where: {
              organisationId,
              serviceUserId: { in: suIds },
              status: "ACTIVE",
            },
            select: { serviceUserId: true, nextReviewDate: true },
            distinct: ["serviceUserId"],
          })
        : [];
      const plansUpToDate = withPlanSUs.filter(
        (p) => !p.nextReviewDate || new Date(p.nextReviewDate) >= now
      ).length;
      const personalPlansScore =
        totalSU > 0 ? clamp((plansUpToDate / totalSU) * 100) : 100;

      // ── Staff Compliance (25%) ──
      const activeStaff = await ctx.prisma.staffMember.findMany({
        where: { organisationId, status: "ACTIVE" },
        select: { id: true },
      });
      const staffIds = activeStaff.map((s) => s.id);
      const totalStaff = staffIds.length;

      if (totalStaff === 0) {
        // No staff — perfect score
        const staffScore = 100;
        // Skip detailed calculations, return simplified
        const [openIncidents, totalIncidents] = await Promise.all([
          ctx.prisma.incident.count({
            where: { organisationId, status: { not: "CLOSED" } },
          }),
          ctx.prisma.incident.count({ where: { organisationId } }),
        ]);
        const incidentsScore =
          totalIncidents > 0
            ? clamp(
                ((totalIncidents - openIncidents) / totalIncidents) * 100
              )
            : 100;

        const overallScore = Math.round(
          personalPlansScore * 0.2 +
            staffScore * 0.25 +
            incidentsScore * 0.15 +
            100 * 0.1 + // complaints
            100 * 0.1 + // policies
            100 * 0.1 + // audits
            100 * 0.05 + // equipment
            100 * 0.05 // reviews
        );

        return {
          overall: overallScore,
          categories: {
            personalPlans: Math.round(personalPlansScore),
            staffCompliance: staffScore,
            incidents: Math.round(incidentsScore),
            complaints: 100,
            policies: 100,
            audits: 100,
            equipment: 100,
            reviews: 100,
          },
        };
      }

      // PVG: % of staff with valid (non-expiring-soon) PVG
      const validPvg = await ctx.prisma.staffPvgRecord.findMany({
        where: {
          organisationId,
          staffMemberId: { in: staffIds },
          OR: [
            { renewalDate: null },
            { renewalDate: { gte: days90Future } },
          ],
        },
        select: { staffMemberId: true },
        distinct: ["staffMemberId"],
      });

      // SSSC: % of staff with valid registration
      const validSssc = await ctx.prisma.staffRegistration.findMany({
        where: {
          organisationId,
          staffMemberId: { in: staffIds },
          registrationType: "SSSC",
          OR: [
            { expiryDate: null },
            { expiryDate: { gte: now } },
          ],
        },
        select: { staffMemberId: true },
        distinct: ["staffMemberId"],
      });

      // Mandatory training: % with at least one current mandatory training
      const validMandatory = await ctx.prisma.staffTrainingRecord.findMany({
        where: {
          organisationId,
          staffMemberId: { in: staffIds },
          isMandatory: true,
          OR: [
            { expiryDate: null },
            { expiryDate: { gte: now } },
          ],
        },
        select: { staffMemberId: true },
        distinct: ["staffMemberId"],
      });

      // Supervisions: % with supervision in last 3 months
      const recentSups = await ctx.prisma.staffSupervision.findMany({
        where: {
          organisationId,
          staffMemberId: { in: staffIds },
          supervisionDate: { gte: months3Ago },
        },
        select: { staffMemberId: true },
        distinct: ["staffMemberId"],
      });

      // Appraisals: % with appraisal in last 12 months
      const recentApps = await ctx.prisma.staffAppraisal.findMany({
        where: {
          organisationId,
          staffMemberId: { in: staffIds },
          appraisalDate: { gte: months12Ago },
        },
        select: { staffMemberId: true },
        distinct: ["staffMemberId"],
      });

      // Staff compliance composite: avg of 5 sub-scores
      const pvgPct = (validPvg.length / totalStaff) * 100;
      const ssscPct = (validSssc.length / totalStaff) * 100;
      const mandatoryPct = (validMandatory.length / totalStaff) * 100;
      const supPct = (recentSups.length / totalStaff) * 100;
      const appPct = (recentApps.length / totalStaff) * 100;
      const staffScore = clamp(
        (pvgPct + ssscPct + mandatoryPct + supPct + appPct) / 5
      );

      // ── Incidents (15%) ──
      const [openIncidents, totalIncidents] = await Promise.all([
        ctx.prisma.incident.count({
          where: { organisationId, status: { not: "CLOSED" } },
        }),
        ctx.prisma.incident.count({ where: { organisationId } }),
      ]);
      const incidentsScore =
        totalIncidents > 0
          ? clamp(
              ((totalIncidents - openIncidents) / totalIncidents) * 100
            )
          : 100;

      // ── Complaints SLA (10%) ──
      const openComplaints = await ctx.prisma.complaint.findMany({
        where: { organisationId, status: { not: "RESOLVED" } },
        select: { dateReceived: true },
      });
      const totalComplaints = await ctx.prisma.complaint.count({
        where: { organisationId },
      });
      const overdueComplaints = openComplaints.filter((c) => {
        const deadline = addWorkingDays(new Date(c.dateReceived), 20);
        return now > deadline;
      }).length;
      const complaintsScore =
        totalComplaints > 0
          ? clamp(
              ((totalComplaints - overdueComplaints) / totalComplaints) * 100
            )
          : 100;

      // ── Policies (10%) ──
      const [activePolicies, overdueReviewCount] = await Promise.all([
        ctx.prisma.policy.count({
          where: { organisationId, status: "ACTIVE" },
        }),
        ctx.prisma.policy.count({
          where: {
            organisationId,
            status: "ACTIVE",
            nextReviewDate: { lt: now },
          },
        }),
      ]);
      const policiesScore =
        activePolicies > 0
          ? clamp(
              ((activePolicies - overdueReviewCount) / activePolicies) * 100
            )
          : 100;

      // ── Audits (10%) ──
      const allAudits = await ctx.prisma.qualityAudit.findMany({
        where: { organisationId },
        select: { status: true, actionPlan: true },
      });
      type AuditActionItem2 = { status: string };
      let totalActions = 0;
      let completedActions = 0;
      for (const a of allAudits) {
        const plan = (a.actionPlan as unknown as AuditActionItem2[] | null) ?? [];
        totalActions += plan.length;
        completedActions += plan.filter((p) => p.status === "COMPLETED").length;
      }
      const closedAudits = allAudits.filter((a) => a.status === "CLOSED").length;
      const auditClosureRate =
        allAudits.length > 0 ? (closedAudits / allAudits.length) * 100 : 100;
      const actionCompletionRate =
        totalActions > 0 ? (completedActions / totalActions) * 100 : 100;
      const auditsScore = clamp((auditClosureRate + actionCompletionRate) / 2);

      // ── Equipment (5%) ──
      const [totalEquipment, overdueEquipment] = await Promise.all([
        ctx.prisma.equipmentCheck.count({ where: { organisationId } }),
        ctx.prisma.equipmentCheck.count({
          where: { organisationId, nextCheckDate: { lt: now } },
        }),
      ]);
      const equipmentScore =
        totalEquipment > 0
          ? clamp(
              ((totalEquipment - overdueEquipment) / totalEquipment) * 100
            )
          : 100;

      // ── Reviews (5%) ──
      const recentReviews = totalSU > 0
        ? await ctx.prisma.serviceUserReview.findMany({
            where: {
              organisationId,
              serviceUserId: { in: suIds },
              reviewDate: { gte: months12Ago },
            },
            select: { serviceUserId: true },
            distinct: ["serviceUserId"],
          })
        : [];
      const reviewsScore =
        totalSU > 0 ? clamp((recentReviews.length / totalSU) * 100) : 100;

      // ── Weighted overall ──
      const overall = Math.round(
        personalPlansScore * 0.2 +
          staffScore * 0.25 +
          incidentsScore * 0.15 +
          complaintsScore * 0.1 +
          policiesScore * 0.1 +
          auditsScore * 0.1 +
          equipmentScore * 0.05 +
          reviewsScore * 0.05
      );

      return {
        overall,
        categories: {
          personalPlans: Math.round(personalPlansScore),
          staffCompliance: Math.round(staffScore),
          incidents: Math.round(incidentsScore),
          complaints: Math.round(complaintsScore),
          policies: Math.round(policiesScore),
          audits: Math.round(auditsScore),
          equipment: Math.round(equipmentScore),
          reviews: Math.round(reviewsScore),
        },
      };
    }),
  }),

  // ── Legacy flat procedures (backwards compat) ──────────────────────────

  /** @deprecated use compliance.policies.list */
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
          policyName: {
            contains: input.search,
            mode: "insensitive" as const,
          },
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

  /** @deprecated use compliance.complaints.list */
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

  /** @deprecated use compliance.complaints.create */
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
        data: {
          ...input,
          organisationId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }),

  /** @deprecated use compliance.audits.list */
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

  /** @deprecated use compliance.inspections.list */
  listInspections: protectedProcedure.query(async ({ ctx }) => {
    const { organisationId } = ctx.user as { organisationId: string };
    return ctx.prisma.careInspectorateInspection.findMany({
      where: { organisationId },
      orderBy: { inspectionDate: "desc" },
    });
  }),

  /** @deprecated — CI notifications now in incidents.ciNotifications */
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

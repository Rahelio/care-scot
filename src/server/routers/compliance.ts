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
import { paginationSchema } from "../shared/validators";

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
        const skip = (input.page - 1) * input.limit;
        const where = {
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
          ctx.db.policy.findMany({
            where,
            skip,
            take: input.limit,
            orderBy: [{ policyCategory: "asc" }, { policyName: "asc" }],
            include: {
              _count: { select: { acknowledgments: true } },
            },
          }),
          ctx.db.policy.count({ where }),
        ]);
        return { items, total, page: input.page, limit: input.limit };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const policy = await ctx.db.policy.findUnique({
          where: { id: input.id },
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
        const { effectiveDate, reviewDate, nextReviewDate, ...rest } = input;
        return ctx.db.policy.create({
          data: {
            ...rest,
            effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
            reviewDate: reviewDate ? new Date(reviewDate) : undefined,
            nextReviewDate: nextReviewDate
              ? new Date(nextReviewDate)
              : undefined,
            organisationId: ctx.user.organisationId,
            version: 1,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
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
          id: z.string().min(1),
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
        const { id, newVersion, effectiveDate, reviewDate, nextReviewDate, ...data } =
          input;

        if (newVersion) {
          // Archive the old version
          const existing = await ctx.db.policy.findUniqueOrThrow({
            where: { id },
          });
          await ctx.db.policy.update({
            where: { id },
            data: { status: "ARCHIVED", updatedBy: ctx.user.id },
          });
          // Create new version
          return ctx.db.policy.create({
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
              organisationId: ctx.user.organisationId,
              createdBy: ctx.user.id,
              updatedBy: ctx.user.id,
            },
          });
        }

        return ctx.db.policy.update({
          where: { id },
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
              data.status === "ACTIVE" ? ctx.user.id : undefined,
            approvedDate:
              data.status === "ACTIVE" ? new Date() : undefined,
            updatedBy: ctx.user.id,
          },
        });
      }),

    /** Staff member acknowledges a policy */
    acknowledge: protectedProcedure
      .input(z.object({ policyId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user.staffMemberId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No staff member profile linked to your account.",
          });
        }
        const staffMemberId = ctx.user.staffMemberId;

        // Upsert acknowledgment
        const existing = await ctx.db.policyAcknowledgment.findFirst({
          where: { policyId: input.policyId, staffMemberId },
        });

        if (existing) {
          return ctx.db.policyAcknowledgment.update({
            where: { id: existing.id },
            data: { acknowledged: true, acknowledgedDate: new Date() },
          });
        }

        return ctx.db.policyAcknowledgment.create({
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
      .input(z.object({ policyId: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const [totalStaff, acknowledgments] = await Promise.all([
          ctx.db.staffMember.count({
            where: { status: "ACTIVE" },
          }),
          ctx.db.policyAcknowledgment.findMany({
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
          ...paginationSchema.shape,
        })
      )
      .query(async ({ ctx, input }) => {
        const skip = (input.page - 1) * input.limit;
        const where = {
          ...(input.status && { status: input.status }),
        };

        const [items, total] = await Promise.all([
          ctx.db.complaint.findMany({
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
          ctx.db.complaint.count({ where }),
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
      .input(z.object({ id: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const complaint = await ctx.db.complaint.findUnique({
          where: { id: input.id },
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
          serviceUserId: z.string().min(1).optional(),
          natureOfComplaint: z.string().min(1, "Description is required"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { dateReceived, ...rest } = input;
        return ctx.db.complaint.create({
          data: {
            ...rest,
            dateReceived: new Date(dateReceived),
            organisationId: ctx.user.organisationId,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          },
        });
      }),

    update: manageProcedure
      .input(
        z.object({
          id: z.string().min(1),
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
        const {
          id,
          responseSentDate,
          referralDate,
          actionsTaken,
          ...data
        } = input;

        const updateData: Record<string, unknown> = {
          ...data,
          updatedBy: ctx.user.id,
        };
        if (responseSentDate)
          updateData.responseSentDate = new Date(responseSentDate);
        if (referralDate) updateData.referralDate = new Date(referralDate);
        if (actionsTaken) updateData.actionsTaken = actionsTaken;
        if (data.status === "INVESTIGATING")
          updateData.investigatedBy = ctx.user.id;
        if (data.status === "RESOLVED")
          updateData.closedDate = new Date();

        return ctx.db.complaint.update({
          where: { id },
          data: updateData,
        });
      }),
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // COMPLIMENTS
  // ══════════════════════════════════════════════════════════════════════════

  compliments: router({
    list: protectedProcedure
      .input(paginationSchema)
      .query(async ({ ctx, input }) => {
        const skip = (input.page - 1) * input.limit;
        const [items, total] = await Promise.all([
          ctx.db.compliment.findMany({
            skip,
            take: input.limit,
            orderBy: { dateReceived: "desc" },
            include: {
              serviceUser: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          }),
          ctx.db.compliment.count(),
        ]);
        return { items, total, page: input.page, limit: input.limit };
      }),

    create: protectedProcedure
      .input(
        z.object({
          dateReceived: z.string(), // "YYYY-MM-DD"
          fromName: z.string().min(1),
          serviceUserId: z.string().min(1).optional(),
          complimentText: z.string().optional(),
          sharedWithStaff: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { dateReceived, ...rest } = input;
        return ctx.db.compliment.create({
          data: {
            ...rest,
            dateReceived: new Date(dateReceived),
            organisationId: ctx.user.organisationId,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
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
          ...paginationSchema.shape,
        })
      )
      .query(async ({ ctx, input }) => {
        const skip = (input.page - 1) * input.limit;
        const where = {
          ...(input.auditType && { auditType: input.auditType }),
          ...(input.status && { status: input.status }),
        };
        const [items, total] = await Promise.all([
          ctx.db.qualityAudit.findMany({
            where,
            skip,
            take: input.limit,
            orderBy: { auditDate: "desc" },
            include: {
              auditor: { select: { id: true, email: true } },
            },
          }),
          ctx.db.qualityAudit.count({ where }),
        ]);
        return { items, total, page: input.page, limit: input.limit };
      }),

    getById: manageProcedure
      .input(z.object({ id: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const audit = await ctx.db.qualityAudit.findUnique({
          where: { id: input.id },
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
        const { auditDate, followUpDate, findings, actionPlan, ...rest } =
          input;
        return ctx.db.qualityAudit.create({
          data: {
            ...rest,
            auditDate: new Date(auditDate),
            followUpDate: followUpDate ? new Date(followUpDate) : undefined,
            findings: findings ?? undefined,
            actionPlan: actionPlan ?? undefined,
            organisationId: ctx.user.organisationId,
            auditorId: ctx.user.id,
            status: rest.status ?? "OPEN",
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          },
        });
      }),

    update: manageProcedure
      .input(
        z.object({
          id: z.string().min(1),
          findings: z.array(findingSchema).optional(),
          issues: z.string().optional(),
          recommendations: z.string().optional(),
          actionPlan: z.array(actionItemSchema).optional(),
          followUpDate: z.string().optional(),
          status: z.nativeEnum(AuditStatus).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, followUpDate, findings, actionPlan, ...data } = input;
        return ctx.db.qualityAudit.update({
          where: { id },
          data: {
            ...data,
            followUpDate: followUpDate ? new Date(followUpDate) : undefined,
            findings: findings ?? undefined,
            actionPlan: actionPlan ?? undefined,
            updatedBy: ctx.user.id,
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
          ...paginationSchema.shape,
        })
      )
      .query(async ({ ctx, input }) => {
        const skip = (input.page - 1) * input.limit;
        const where = {
          ...(input.surveyType && { surveyType: input.surveyType }),
        };
        const [items, total] = await Promise.all([
          ctx.db.satisfactionSurvey.findMany({
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
          ctx.db.satisfactionSurvey.count({ where }),
        ]);
        return { items, total, page: input.page, limit: input.limit };
      }),

    create: protectedProcedure
      .input(
        z.object({
          surveyDate: z.string(),
          surveyType: z.nativeEnum(SurveyType),
          serviceUserId: z.string().min(1).optional(),
          overallRating: z.string().optional(), // parse to int in handler
          comments: z.string().optional(),
          actionsFromFeedback: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { surveyDate, overallRating, ...rest } = input;
        return ctx.db.satisfactionSurvey.create({
          data: {
            ...rest,
            surveyDate: new Date(surveyDate),
            overallRating: overallRating
              ? parseInt(overallRating, 10)
              : undefined,
            organisationId: ctx.user.organisationId,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          },
        });
      }),

    getSummary: protectedProcedure.query(async ({ ctx }) => {
      const surveys = await ctx.db.satisfactionSurvey.findMany({
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
      return ctx.db.careInspectorateInspection.findMany({
        orderBy: { inspectionDate: "desc" },
        include: {
          actionPlan: { select: { id: true, status: true } },
        },
      });
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const inspection =
          await ctx.db.careInspectorateInspection.findUnique({
            where: { id: input.id },
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
        const { inspectionDate, grades, requirements, recommendations, ...rest } =
          input;
        return ctx.db.careInspectorateInspection.create({
          data: {
            ...rest,
            inspectionDate: new Date(inspectionDate),
            grades: grades ?? undefined,
            requirements: requirements ?? undefined,
            recommendations: recommendations ?? undefined,
            organisationId: ctx.user.organisationId,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          },
        });
      }),

    update: manageProcedure
      .input(
        z.object({
          id: z.string().min(1),
          inspectorName: z.string().optional(),
          grades: z.record(z.string(), z.number().min(1).max(6)).optional(),
          reportSummary: z.string().optional(),
          requirements: z.array(requirementSchema).optional(),
          recommendations: z.array(requirementSchema).optional(),
          actionPlanId: z.string().min(1).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, grades, requirements, recommendations, ...data } = input;
        return ctx.db.careInspectorateInspection.update({
          where: { id },
          data: {
            ...data,
            grades: grades ?? undefined,
            requirements: requirements ?? undefined,
            recommendations: recommendations ?? undefined,
            updatedBy: ctx.user.id,
          },
        });
      }),
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // ANNUAL RETURNS
  // ══════════════════════════════════════════════════════════════════════════

  annualReturns: router({
    list: manageProcedure.query(async ({ ctx }) => {
      return ctx.db.annualReturn.findMany({
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
        const { deadlineDate, ...rest } = input;
        return ctx.db.annualReturn.create({
          data: {
            ...rest,
            deadlineDate: deadlineDate ? new Date(deadlineDate) : undefined,
            organisationId: ctx.user.organisationId,
            status: "DRAFT",
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          },
        });
      }),

    update: manageProcedure
      .input(
        z.object({
          id: z.string().min(1),
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
        const { id, submissionDate, ...data } = input;
        return ctx.db.annualReturn.update({
          where: { id },
          data: {
            ...data,
            submissionDate: submissionDate
              ? new Date(submissionDate)
              : undefined,
            updatedBy: ctx.user.id,
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
        const yearStart = new Date(input.year, 0, 1);
        const yearEnd = new Date(input.year, 11, 31);

        const [serviceUserCount, staffCount, complaints, incidents] =
          await Promise.all([
            ctx.db.serviceUser.count({
              where: { status: "ACTIVE" },
            }),
            ctx.db.staffMember.count({
              where: { status: "ACTIVE" },
            }),
            ctx.db.complaint.findMany({
              where: {
                dateReceived: { gte: yearStart, lte: yearEnd },
              },
              select: {
                status: true,
                natureOfComplaint: true,
              },
            }),
            ctx.db.incident.findMany({
              where: {
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
      const now = new Date();
      const days28Ago = new Date(now.getTime() - 28 * 86_400_000);
      const days90Future = new Date(now.getTime() + 90 * 86_400_000);
      const months3Ago = new Date(now);
      months3Ago.setMonth(months3Ago.getMonth() - 3);
      const months12Ago = new Date(now);
      months12Ago.setMonth(months12Ago.getMonth() - 12);

      // ── Personal Plans ──
      const activeServiceUsers = await ctx.db.serviceUser.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
      });
      const suIds = activeServiceUsers.map((su) => su.id);
      const totalSU = suIds.length;

      // Find service users that have at least one ACTIVE personal plan
      const withPlanSUs = totalSU > 0
        ? await ctx.db.personalPlan.findMany({
            where: {
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
        ? await ctx.db.personalPlan.count({
            where: {
              status: "ACTIVE",
              nextReviewDate: { lt: days28Ago },
            },
          })
        : 0;

      // Due for review: ACTIVE plans where nextReviewDate <= now
      const dueForReview = totalSU > 0
        ? await ctx.db.personalPlan.count({
            where: {
              status: "ACTIVE",
              nextReviewDate: { lte: now, gte: days28Ago },
            },
          })
        : 0;

      // ── Staff Compliance ──
      const activeStaff = await ctx.db.staffMember.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
      });
      const staffIds = activeStaff.map((s) => s.id);
      const totalStaff = staffIds.length;

      // PVG expiring in 90 days
      const pvgExpiring = totalStaff > 0
        ? await ctx.db.staffPvgRecord.count({
            where: {
              staffMemberId: { in: staffIds },
              renewalDate: { lte: days90Future, gte: now },
            },
          })
        : 0;

      // SSSC expiring in 90 days
      const ssscExpiring = totalStaff > 0
        ? await ctx.db.staffRegistration.count({
            where: {
              staffMemberId: { in: staffIds },
              registrationType: "SSSC",
              expiryDate: { lte: days90Future, gte: now },
            },
          })
        : 0;

      // Staff missing mandatory training (active staff with no mandatory training records)
      const staffWithMandatory = totalStaff > 0
        ? await ctx.db.staffTrainingRecord.findMany({
            where: {
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
        ? await ctx.db.staffTrainingRecord.count({
            where: {
              staffMemberId: { in: staffIds },
              isMandatory: true,
              expiryDate: { lte: days90Future, gte: now },
            },
          })
        : 0;

      // Overdue supervisions (>3 months since last)
      const recentSupervisions = totalStaff > 0
        ? await ctx.db.staffSupervision.findMany({
            where: {
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
        ? await ctx.db.staffAppraisal.findMany({
            where: {
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
        ctx.db.incident.count({
          where: { status: { not: "CLOSED" } },
        }),
        ctx.db.incident.count({
          where: {
            status: { not: "CLOSED" },
            severity: { in: ["HIGH", "CRITICAL"] },
          },
        }),
        ctx.db.careInspectorateNotification.count({
          where: { submittedDate: null },
        }),
        ctx.db.safeguardingConcern.count({
          where: { status: { not: "CLOSED" } },
        }),
      ]);

      // ── Complaints ──
      const openComplaints = await ctx.db.complaint.findMany({
        where: { status: { not: "RESOLVED" } },
        select: { dateReceived: true },
      });
      const overdueComplaints = openComplaints.filter((c) => {
        const deadline = addWorkingDays(new Date(c.dateReceived), 20);
        return now > deadline;
      }).length;

      // ── Policies ──
      const overdueReviews = await ctx.db.policy.count({
        where: {
          status: "ACTIVE",
          nextReviewDate: { lt: now },
        },
      });

      const activePolicies = await ctx.db.policy.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
      });
      const policyIds = activePolicies.map((p) => p.id);

      // Total expected acknowledgments vs actual
      const totalExpectedAcks = policyIds.length * totalStaff;
      const actualAcks = policyIds.length > 0
        ? await ctx.db.policyAcknowledgment.count({
            where: {
              policyId: { in: policyIds },
              acknowledged: true,
            },
          })
        : 0;
      const pendingAcknowledgments = totalExpectedAcks - actualAcks;

      // ── Audits ──
      const openAudits = await ctx.db.qualityAudit.findMany({
        where: { status: { not: "CLOSED" } },
        select: { auditType: true, actionPlan: true },
      });
      type AuditActionItem = { status: string };
      let openActionItems = 0;
      for (const a of openAudits) {
        const plan = (a.actionPlan as unknown as AuditActionItem[] | null) ?? [];
        openActionItems += plan.filter((p) => p.status !== "COMPLETED").length;
      }

      // ── Equipment ──
      const overdueEquipment = await ctx.db.equipmentCheck.count({
        where: {
          nextCheckDate: { lt: now },
        },
      });

      // ── Reviews ──
      // Service users without a review in the last 12 months
      const recentReviews = totalSU > 0
        ? await ctx.db.serviceUserReview.findMany({
            where: {
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
      const now = new Date();
      const days90Future = new Date(now.getTime() + 90 * 86_400_000);
      const months3Ago = new Date(now);
      months3Ago.setMonth(months3Ago.getMonth() - 3);
      const months12Ago = new Date(now);
      months12Ago.setMonth(months12Ago.getMonth() - 12);

      // Helper: clamp between 0-100
      const clamp = (v: number) => Math.max(0, Math.min(100, v));

      // ── Personal Plans (20%) ──
      const activeServiceUsers = await ctx.db.serviceUser.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
      });
      const suIds = activeServiceUsers.map((su) => su.id);
      const totalSU = suIds.length;

      const withPlanSUs = totalSU > 0
        ? await ctx.db.personalPlan.findMany({
            where: {
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
      const activeStaff = await ctx.db.staffMember.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
      });
      const staffIds = activeStaff.map((s) => s.id);
      const totalStaff = staffIds.length;

      if (totalStaff === 0) {
        // No staff — perfect score
        const staffScore = 100;
        // Skip detailed calculations, return simplified
        const [openIncidents, totalIncidents] = await Promise.all([
          ctx.db.incident.count({
            where: { status: { not: "CLOSED" } },
          }),
          ctx.db.incident.count(),
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
      const validPvg = await ctx.db.staffPvgRecord.findMany({
        where: {
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
      const validSssc = await ctx.db.staffRegistration.findMany({
        where: {
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
      const validMandatory = await ctx.db.staffTrainingRecord.findMany({
        where: {
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
      const recentSups = await ctx.db.staffSupervision.findMany({
        where: {
          staffMemberId: { in: staffIds },
          supervisionDate: { gte: months3Ago },
        },
        select: { staffMemberId: true },
        distinct: ["staffMemberId"],
      });

      // Appraisals: % with appraisal in last 12 months
      const recentApps = await ctx.db.staffAppraisal.findMany({
        where: {
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
        ctx.db.incident.count({
          where: { status: { not: "CLOSED" } },
        }),
        ctx.db.incident.count(),
      ]);
      const incidentsScore =
        totalIncidents > 0
          ? clamp(
              ((totalIncidents - openIncidents) / totalIncidents) * 100
            )
          : 100;

      // ── Complaints SLA (10%) ──
      const openComplaints = await ctx.db.complaint.findMany({
        where: { status: { not: "RESOLVED" } },
        select: { dateReceived: true },
      });
      const totalComplaints = await ctx.db.complaint.count();
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
        ctx.db.policy.count({
          where: { status: "ACTIVE" },
        }),
        ctx.db.policy.count({
          where: {
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
      const allAudits = await ctx.db.qualityAudit.findMany({
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
        ctx.db.equipmentCheck.count(),
        ctx.db.equipmentCheck.count({
          where: { nextCheckDate: { lt: now } },
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
        ? await ctx.db.serviceUserReview.findMany({
            where: {
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
});

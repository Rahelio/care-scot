import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  MedicationStatus,
  MedicationErrorType,
  NccMerpCategory,
  AuditStatus,
} from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { requirePermission, requireRole } from "../middleware/rbac";

const medReadProcedure = protectedProcedure.use(requirePermission("medication.read"));
const medAdminProcedure = protectedProcedure.use(requirePermission("medication.administer"));
const medManageProcedure = protectedProcedure.use(requirePermission("incidents.manage"));
const auditsManageProcedure = protectedProcedure.use(requirePermission("audits.manage"));

// NCC MERP categories that require Care Inspectorate notification
const HIGH_SEVERITY_CATEGORIES: NccMerpCategory[] = ["E", "F", "G", "H", "I"];

// Shared Zod schemas for audit findings JSON
const auditFindingSchema = z.object({
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

export const medicationRouter = router({
  // ── Medications ───────────────────────────

  listForClient: medReadProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        status: z.nativeEnum(MedicationStatus).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.serviceUserMedication.findMany({
        where: {
          serviceUserId: input.serviceUserId,
          organisationId,
          ...(input.status && { status: input.status }),
        },
        orderBy: [{ isPrn: "asc" }, { medicationName: "asc" }],
      });
    }),

  addMedication: medAdminProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        medicationName: z.string().min(1),
        form: z.string().optional(),
        dose: z.string().optional(),
        frequency: z.string().optional(),
        route: z.string().optional(),
        prescriber: z.string().optional(),
        pharmacy: z.string().optional(),
        startDate: z.string(), // "YYYY-MM-DD"
        endDate: z.string().optional(),
        isPrn: z.boolean(),
        prnReason: z.string().optional(),
        prnMaxDose: z.string().optional(),
        isControlledDrug: z.boolean(),
        specialInstructions: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      const { startDate, endDate, ...rest } = input;
      return ctx.prisma.serviceUserMedication.create({
        data: {
          ...rest,
          form: rest.form as never,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : undefined,
          organisationId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }),

  update: medAdminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        medicationName: z.string().min(1).optional(),
        form: z.string().optional(),
        dose: z.string().optional(),
        frequency: z.string().optional(),
        route: z.string().optional(),
        prescriber: z.string().optional(),
        pharmacy: z.string().optional(),
        endDate: z.string().optional(),
        isPrn: z.boolean().optional(),
        prnReason: z.string().optional(),
        prnMaxDose: z.string().optional(),
        isControlledDrug: z.boolean().optional(),
        specialInstructions: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      const { id, endDate, ...data } = input;
      return ctx.prisma.serviceUserMedication.update({
        where: { id, organisationId },
        data: {
          ...data,
          form: data.form as never,
          endDate: endDate ? new Date(endDate) : undefined,
          updatedBy: userId,
        },
      });
    }),

  discontinue: medAdminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        discontinuedReason: z.string().optional(),
        endDate: z.string().optional(), // "YYYY-MM-DD"
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      return ctx.prisma.serviceUserMedication.update({
        where: { id: input.id, organisationId },
        data: {
          status: "DISCONTINUED",
          discontinuedReason: input.discontinuedReason,
          endDate: input.endDate ? new Date(input.endDate) : new Date(),
          updatedBy: userId,
        },
      });
    }),

  // ── MAR Chart ─────────────────────────────

  getMarByMonth: medReadProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        year: z.number().int().min(2020).max(2100),
        month: z.number().int().min(1).max(12),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0);

      const [medications, records] = await Promise.all([
        ctx.prisma.serviceUserMedication.findMany({
          where: {
            serviceUserId: input.serviceUserId,
            organisationId,
            status: { not: "DISCONTINUED" },
          },
          orderBy: [{ isPrn: "asc" }, { medicationName: "asc" }],
        }),
        ctx.prisma.medicationAdminRecord.findMany({
          where: {
            serviceUserId: input.serviceUserId,
            organisationId,
            scheduledDate: { gte: startDate, lte: endDate },
          },
          include: {
            administeredByStaff: {
              select: { id: true, firstName: true, lastName: true },
            },
            witness: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
        }),
      ]);

      return { medications, records };
    }),

  marRecord: medAdminProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        medicationId: z.string().min(1),
        scheduledDate: z.string(), // "YYYY-MM-DD"
        scheduledTime: z.string(), // "HH:MM"
        administered: z.boolean(),
        doseGiven: z.string().optional(),
        refused: z.boolean(),
        refusedReason: z.string().optional(),
        notAvailable: z.boolean(),
        notAvailableReason: z.string().optional(),
        prnReasonGiven: z.string().optional(),
        outcomeNotes: z.string().optional(),
        witnessId: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId, staffMemberId } = ctx.user as {
        organisationId: string;
        id: string;
        staffMemberId: string | null;
      };

      if (!staffMemberId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No staff member profile linked to your account",
        });
      }

      const medication = await ctx.prisma.serviceUserMedication.findUnique({
        where: { id: input.medicationId },
      });
      if (!medication || medication.organisationId !== organisationId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (medication.isControlledDrug && input.administered && !input.witnessId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A witness is required for controlled drug administration",
        });
      }

      if (medication.isPrn && input.administered && !input.prnReasonGiven) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A reason is required for PRN administrations",
        });
      }

      return ctx.prisma.medicationAdminRecord.create({
        data: {
          serviceUserId: input.serviceUserId,
          medicationId: input.medicationId,
          organisationId,
          scheduledDate: new Date(input.scheduledDate),
          scheduledTime: input.scheduledTime,
          administered: input.administered,
          administeredBy: input.administered ? staffMemberId : undefined,
          administeredAt: input.administered ? new Date() : undefined,
          doseGiven: input.doseGiven,
          refused: input.refused,
          refusedReason: input.refusedReason,
          notAvailable: input.notAvailable,
          notAvailableReason: input.notAvailableReason,
          prnReasonGiven: input.prnReasonGiven,
          outcomeNotes: input.outcomeNotes,
          witnessId: input.witnessId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }),

  listStaffForWitness: medAdminProcedure.query(async ({ ctx }) => {
    const { organisationId } = ctx.user as { organisationId: string };
    return ctx.prisma.staffMember.findMany({
      where: { organisationId, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
  }),

  // ── Legacy ─────────────────────────────────

  getMarChart: medReadProcedure
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        date: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      const dateOnly = input.date.toISOString().split("T")[0];

      return ctx.prisma.medicationAdminRecord.findMany({
        where: {
          serviceUserId: input.serviceUserId,
          organisationId,
          scheduledDate: new Date(dateOnly),
        },
        include: {
          medication: true,
          administeredByStaff: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
      });
    }),

  // ── Errors ─────────────────────────────────

  errors: router({
    /**
     * Report a medication error. Any authenticated staff member may report.
     * If NCC MERP category E–I: auto-creates a Care Inspectorate notification
     * draft and sends an escalation notification to all MANAGER+ users.
     */
    report: protectedProcedure
      .input(
        z.object({
          serviceUserId: z.string().min(1).optional(),
          errorDate: z.string(), // "YYYY-MM-DD"
          errorType: z.nativeEnum(MedicationErrorType),
          nccMerpCategory: z.nativeEnum(NccMerpCategory).optional(),
          description: z.string().min(1, "Description is required"),
          actionTaken: z.string().optional(),
          lessonsLearned: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId, staffMemberId } = ctx.user as {
          organisationId: string;
          id: string;
          staffMemberId: string | null;
        };

        const { errorDate, ...rest } = input;

        const error = await ctx.prisma.medicationError.create({
          data: {
            ...rest,
            errorDate: new Date(errorDate),
            organisationId,
            reportedBy: staffMemberId ?? undefined,
            reportedDate: new Date(),
            createdBy: userId,
            updatedBy: userId,
          },
        });

        // Escalate if high-severity NCC MERP category (E–I)
        if (
          input.nccMerpCategory &&
          HIGH_SEVERITY_CATEGORIES.includes(input.nccMerpCategory)
        ) {
          // Auto-create a draft Care Inspectorate notification
          await ctx.prisma.careInspectorateNotification.create({
            data: {
              organisationId,
              notificationType: "MEDICATION_ERROR_E_PLUS",
              description: `Auto-generated from medication error report. Category ${input.nccMerpCategory}. ${input.description}`.slice(0, 500),
              createdBy: userId,
              updatedBy: userId,
            },
          });

          // Notify all MANAGER+ users in the organisation
          const managers = await ctx.prisma.user.findMany({
            where: {
              organisationId,
              role: { in: ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"] },
            },
            select: { id: true },
          });

          if (managers.length > 0) {
            await ctx.prisma.notification.createMany({
              data: managers.map((mgr) => ({
                organisationId,
                userId: mgr.id,
                title: `Medication Error — Category ${input.nccMerpCategory} Escalation`,
                message: `A NCC MERP Category ${input.nccMerpCategory} medication error has been reported. A Care Inspectorate notification draft has been created and investigation is required.`,
                entityType: "medication_error",
                entityId: error.id,
                link: `/medication/errors/${error.id}`,
              })),
            });
          }
        }

        return error;
      }),

    /**
     * Update investigation details. MANAGER+ only.
     */
    update: medManageProcedure
      .input(
        z.object({
          id: z.string().min(1),
          investigationOutcome: z.string().optional(),
          careInspectorateNotified: z.boolean().optional(),
          notificationDate: z.string().optional(), // "YYYY-MM-DD"
          lessonsLearned: z.string().optional(),
          actionTaken: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as {
          organisationId: string;
          id: string;
        };
        const { id, notificationDate, ...data } = input;
        return ctx.prisma.medicationError.update({
          where: { id, organisationId },
          data: {
            ...data,
            investigatedBy: userId,
            notificationDate: notificationDate ? new Date(notificationDate) : undefined,
            updatedBy: userId,
          },
        });
      }),

    /**
     * Paginated list of all medication errors. Requires medication.read.
     */
    list: medReadProcedure
      .input(
        z.object({
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(100).default(20),
          serviceUserId: z.string().min(1).optional(),
          nccMerpCategory: z.nativeEnum(NccMerpCategory).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        const skip = (input.page - 1) * input.limit;

        const where = {
          organisationId,
          ...(input.serviceUserId && { serviceUserId: input.serviceUserId }),
          ...(input.nccMerpCategory && { nccMerpCategory: input.nccMerpCategory }),
        };

        const [items, total] = await Promise.all([
          ctx.prisma.medicationError.findMany({
            where,
            include: {
              serviceUser: {
                select: { id: true, firstName: true, lastName: true },
              },
              reportedByStaff: {
                select: { id: true, firstName: true, lastName: true },
              },
              investigatedByUser: {
                select: { id: true, email: true },
              },
            },
            orderBy: { errorDate: "desc" },
            skip,
            take: input.limit,
          }),
          ctx.prisma.medicationError.count({ where }),
        ]);

        return { items, total, page: input.page, limit: input.limit };
      }),

    /**
     * All errors for a specific service user.
     */
    getByServiceUser: medReadProcedure
      .input(z.object({ serviceUserId: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        return ctx.prisma.medicationError.findMany({
          where: { serviceUserId: input.serviceUserId, organisationId },
          include: {
            reportedByStaff: {
              select: { id: true, firstName: true, lastName: true },
            },
            investigatedByUser: {
              select: { id: true, email: true },
            },
          },
          orderBy: { errorDate: "desc" },
        });
      }),

    /**
     * Get a single error by id.
     */
    getById: medReadProcedure
      .input(z.object({ id: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        const error = await ctx.prisma.medicationError.findUnique({
          where: { id: input.id, organisationId },
          include: {
            serviceUser: {
              select: { id: true, firstName: true, lastName: true },
            },
            reportedByStaff: {
              select: { id: true, firstName: true, lastName: true },
            },
            investigatedByUser: {
              select: { id: true, email: true },
            },
          },
        });
        if (!error) throw new TRPCError({ code: "NOT_FOUND" });
        return error;
      }),
  }),

  // ── Audits ─────────────────────────────────

  audits: router({
    /**
     * Create a new medication audit with checklist findings.
     */
    create: auditsManageProcedure
      .input(
        z.object({
          auditDate: z.string(), // "YYYY-MM-DD"
          auditorId: z.string().min(1).optional(),
          auditFindings: z.array(auditFindingSchema).optional(),
          issuesIdentified: z.string().optional(),
          actionsRequired: z.array(actionItemSchema).optional(),
          status: z.nativeEnum(AuditStatus).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as {
          organisationId: string;
          id: string;
        };
        const { auditDate, auditFindings, actionsRequired, ...rest } = input;
        return ctx.prisma.medicationAudit.create({
          data: {
            ...rest,
            auditDate: new Date(auditDate),
            auditFindings: auditFindings ?? undefined,
            actionsRequired: actionsRequired ?? undefined,
            organisationId,
            status: rest.status ?? "OPEN",
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }),

    /**
     * Update an existing audit — findings, action plan, status.
     */
    update: auditsManageProcedure
      .input(
        z.object({
          id: z.string().min(1),
          auditFindings: z.array(auditFindingSchema).optional(),
          issuesIdentified: z.string().optional(),
          actionsRequired: z.array(actionItemSchema).optional(),
          status: z.nativeEnum(AuditStatus).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as {
          organisationId: string;
          id: string;
        };
        const { id, auditFindings, actionsRequired, ...data } = input;
        return ctx.prisma.medicationAudit.update({
          where: { id, organisationId },
          data: {
            ...data,
            auditFindings: auditFindings ?? undefined,
            actionsRequired: actionsRequired ?? undefined,
            updatedBy: userId,
          },
        });
      }),

    /**
     * Paginated list of audits. Requires audits.manage.
     */
    list: auditsManageProcedure
      .input(
        z.object({
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(100).default(20),
          status: z.nativeEnum(AuditStatus).optional(),
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
          ctx.prisma.medicationAudit.findMany({
            where,
            include: {
              auditor: { select: { id: true, email: true } },
            },
            orderBy: { auditDate: "desc" },
            skip,
            take: input.limit,
          }),
          ctx.prisma.medicationAudit.count({ where }),
        ]);

        return { items, total, page: input.page, limit: input.limit };
      }),

    /**
     * Get a single audit by id.
     */
    getById: auditsManageProcedure
      .input(z.object({ id: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        const audit = await ctx.prisma.medicationAudit.findUnique({
          where: { id: input.id, organisationId },
          include: {
            auditor: { select: { id: true, email: true } },
          },
        });
        if (!audit) throw new TRPCError({ code: "NOT_FOUND" });
        return audit;
      }),
  }),
});

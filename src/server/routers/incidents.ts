import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  IncidentStatus,
  IncidentSeverity,
  IncidentType,
  SafeguardingStatus,
  EquipmentType,
  CheckResult,
  CareInspectorateNotificationType,
} from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { requirePermission } from "../middleware/rbac";
import { notifyManagers } from "../services/shared/notification-generator";

const incManageProcedure = protectedProcedure.use(
  requirePermission("incidents.manage")
);

// ─── Incident types that auto-trigger escalation ─────────────────────────────

const HIGH_SEVERITIES: IncidentSeverity[] = ["HIGH", "CRITICAL"];

function getCiNotificationType(
  type: IncidentType
): CareInspectorateNotificationType | null {
  switch (type) {
    case "DEATH":
      return "DEATH";
    case "ASSAULT":
      return "SERIOUS_INCIDENT";
    case "SAFEGUARDING":
      return "ABUSE_ALLEGATION";
    case "INFECTIOUS_OUTBREAK":
      return "INFECTIOUS_OUTBREAK";
    default:
      return null;
  }
}

function shouldEscalate(type: IncidentType, severity: IncidentSeverity): boolean {
  if (type === "DEATH" || type === "INFECTIOUS_OUTBREAK") return true;
  if (
    (type === "ASSAULT" || type === "SAFEGUARDING") &&
    HIGH_SEVERITIES.includes(severity)
  )
    return true;
  return false;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const incidentsRouter = router({
  // ── Incidents ──────────────────────────────────────────────────────────────

  list: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(IncidentStatus).optional(),
        severity: z.nativeEnum(IncidentSeverity).optional(),
        serviceUserId: z.string().uuid().optional(),
        from: z.date().optional(),
        to: z.date().optional(),
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
        ...(input.severity && { severity: input.severity }),
        ...(input.serviceUserId && { serviceUserId: input.serviceUserId }),
        ...(input.from || input.to
          ? {
              incidentDate: {
                ...(input.from && { gte: input.from }),
                ...(input.to && { lte: input.to }),
              },
            }
          : {}),
      };

      const [items, total] = await Promise.all([
        ctx.prisma.incident.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { incidentDate: "desc" },
          include: {
            serviceUser: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        }),
        ctx.prisma.incident.count({ where }),
      ]);

      return { items, total, page: input.page, limit: input.limit };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.incident.findUniqueOrThrow({
        where: { id: input.id, organisationId },
        include: {
          serviceUser: {
            select: { id: true, firstName: true, lastName: true },
          },
          staffMember: {
            select: { id: true, firstName: true, lastName: true },
          },
          reportedByUser: {
            select: { id: true, email: true },
          },
          careInspNotifications: true,
        },
      });
    }),

  /**
   * Create an incident. Any authenticated user may report.
   * Auto-escalates (CI notification + manager alert) for:
   *   DEATH, INFECTIOUS_OUTBREAK — always
   *   ASSAULT, SAFEGUARDING — when HIGH or CRITICAL severity
   */
  create: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().uuid().optional(),
        staffMemberId: z.string().uuid().optional(),
        incidentType: z.nativeEnum(IncidentType),
        incidentDate: z.string(), // "YYYY-MM-DD"
        incidentTime: z.string().optional(),
        location: z.string().optional(),
        description: z.string().min(1, "Description is required"),
        severity: z.nativeEnum(IncidentSeverity),
        witnesses: z.string().optional(),
        immediateActionTaken: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };

      const { incidentDate, ...rest } = input;

      const incident = await ctx.prisma.incident.create({
        data: {
          ...rest,
          incidentDate: new Date(incidentDate),
          organisationId,
          reportedBy: userId,
          reportedDate: new Date(),
          createdBy: userId,
          updatedBy: userId,
        },
      });

      if (shouldEscalate(input.incidentType, input.severity)) {
        const ciType = getCiNotificationType(input.incidentType);
        if (ciType) {
          await ctx.prisma.careInspectorateNotification.create({
            data: {
              organisationId,
              incidentId: incident.id,
              notificationType: ciType,
              description:
                `Auto-generated. Type: ${input.incidentType.replace(/_/g, " ")}. ${input.description}`.slice(
                  0,
                  500
                ),
              createdBy: userId,
              updatedBy: userId,
            },
          });
        }

        await notifyManagers(ctx.prisma, {
          organisationId,
          title: `Incident Escalation — ${input.incidentType.replace(/_/g, " ")} (${input.severity})`,
          message: `A ${input.severity} severity ${input.incidentType.replace(/_/g, " ").toLowerCase()} has been reported. Immediate management review required.`,
          entityType: "incident",
          entityId: incident.id,
          link: `/incidents/${incident.id}`,
        });
      }

      return incident;
    }),

  /**
   * Update investigation. MANAGER+ only.
   * Cannot close without investigation notes or actions to prevent recurrence.
   */
  update: incManageProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        investigationNotes: z.string().optional(),
        rootCause: z.string().optional(),
        actionsToPreventRecurrence: z.array(z.string()).optional(),
        outcome: z.string().optional(),
        status: z.nativeEnum(IncidentStatus).optional(),
        riddorReportable: z.boolean().optional(),
        riddorReference: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      const { id, ...data } = input;

      if (data.status === "CLOSED") {
        const existing = await ctx.prisma.incident.findUnique({
          where: { id, organisationId },
          select: { investigationNotes: true, actionsToPreventRecurrence: true },
        });

        const hasNotes =
          (data.investigationNotes && data.investigationNotes.trim().length > 0) ||
          (existing?.investigationNotes &&
            existing.investigationNotes.trim().length > 0);

        const hasActions =
          (data.actionsToPreventRecurrence &&
            data.actionsToPreventRecurrence.length > 0) ||
          (Array.isArray(existing?.actionsToPreventRecurrence) &&
            (existing.actionsToPreventRecurrence as unknown[]).length > 0);

        if (!hasNotes && !hasActions) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Investigation notes or actions to prevent recurrence must be recorded before closing an incident.",
          });
        }
      }

      const updateData: Record<string, unknown> = { ...data, updatedBy: userId };
      if (data.status === "CLOSED") {
        updateData.closedBy = userId;
        updateData.closedDate = new Date();
      }

      return ctx.prisma.incident.update({
        where: { id, organisationId },
        data: updateData,
      });
    }),

  // ── Safeguarding ────────────────────────────────────────────────────────────

  safeguarding: router({
    list: protectedProcedure
      .input(
        z.object({
          serviceUserId: z.string().uuid().optional(),
          status: z.nativeEnum(SafeguardingStatus).optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(20),
        })
      )
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        const skip = (input.page - 1) * input.limit;

        const where = {
          organisationId,
          ...(input.serviceUserId && { serviceUserId: input.serviceUserId }),
          ...(input.status && { status: input.status }),
        };

        const [items, total] = await Promise.all([
          ctx.prisma.safeguardingConcern.findMany({
            where,
            take: input.limit,
            skip,
            orderBy: { concernDate: "desc" },
            include: {
              serviceUser: {
                select: { id: true, firstName: true, lastName: true },
              },
              raisedByUser: { select: { id: true, email: true } },
            },
          }),
          ctx.prisma.safeguardingConcern.count({ where }),
        ]);

        return { items, total, page: input.page, limit: input.limit };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        const concern = await ctx.prisma.safeguardingConcern.findUnique({
          where: { id: input.id, organisationId },
          include: {
            serviceUser: {
              select: { id: true, firstName: true, lastName: true },
            },
            raisedByUser: { select: { id: true, email: true } },
          },
        });
        if (!concern) throw new TRPCError({ code: "NOT_FOUND" });
        return concern;
      }),

    /**
     * Raise a safeguarding concern. Any authenticated user may raise.
     * Auto-notifies MANAGER+ with 24h escalation reminder.
     */
    create: protectedProcedure
      .input(
        z.object({
          serviceUserId: z.string().uuid(),
          concernDate: z.string(), // "YYYY-MM-DD"
          concernType: z.string(),
          description: z.string().min(1, "Description is required"),
          referredTo: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as {
          organisationId: string;
          id: string;
        };

        const { concernDate, ...rest } = input;

        const concern = await ctx.prisma.safeguardingConcern.create({
          data: {
            ...rest,
            concernType: input.concernType as never,
            concernDate: new Date(concernDate),
            organisationId,
            raisedBy: userId,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        await notifyManagers(ctx.prisma, {
          organisationId,
          title: "Safeguarding Concern Raised — 24h Escalation Required",
          message: `A ${input.concernType.replace(/_/g, " ").toLowerCase()} safeguarding concern has been raised. Referral to Adult Support & Protection may be required within 24 hours.`,
          entityType: "safeguarding",
          entityId: concern.id,
          link: `/incidents/safeguarding/${concern.id}`,
        });

        return concern;
      }),

    /**
     * Update safeguarding — referral details, investigation, actions. MANAGER+ only.
     */
    update: incManageProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          referredTo: z.string().optional(),
          referralDate: z.string().optional(), // "YYYY-MM-DD"
          referralReference: z.string().optional(),
          adultProtectionInvestigation: z.boolean().optional(),
          investigationOutcome: z.string().optional(),
          actionsTaken: z.string().optional(),
          status: z.nativeEnum(SafeguardingStatus).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as {
          organisationId: string;
          id: string;
        };
        const { id, referralDate, ...data } = input;
        return ctx.prisma.safeguardingConcern.update({
          where: { id, organisationId },
          data: {
            ...data,
            referralDate: referralDate ? new Date(referralDate) : undefined,
            updatedBy: userId,
          },
        });
      }),
  }),

  // ── CI Notifications ────────────────────────────────────────────────────────

  ciNotifications: router({
    list: incManageProcedure
      .input(
        z.object({
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(20),
        })
      )
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        const skip = (input.page - 1) * input.limit;
        const where = { organisationId };

        const [items, total] = await Promise.all([
          ctx.prisma.careInspectorateNotification.findMany({
            where,
            skip,
            take: input.limit,
            orderBy: { createdAt: "desc" },
            include: {
              incident: {
                select: {
                  id: true,
                  incidentType: true,
                  incidentDate: true,
                  severity: true,
                },
              },
            },
          }),
          ctx.prisma.careInspectorateNotification.count({ where }),
        ]);

        return { items, total, page: input.page, limit: input.limit };
      }),

    getPending: incManageProcedure.query(async ({ ctx }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.careInspectorateNotification.findMany({
        where: { organisationId, submittedDate: null },
        orderBy: { createdAt: "desc" },
        include: {
          incident: {
            select: {
              id: true,
              incidentType: true,
              incidentDate: true,
              severity: true,
            },
          },
        },
      });
    }),

    create: incManageProcedure
      .input(
        z.object({
          incidentId: z.string().uuid().optional(),
          notificationType: z.nativeEnum(CareInspectorateNotificationType),
          description: z.string().optional(),
          actionsTaken: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as {
          organisationId: string;
          id: string;
        };
        return ctx.prisma.careInspectorateNotification.create({
          data: {
            ...input,
            organisationId,
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }),

    /**
     * Mark a CI notification as submitted (or update follow-up details).
     */
    update: incManageProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          submittedDate: z.string().optional(), // "YYYY-MM-DD"
          careInspectorateReference: z.string().optional(),
          description: z.string().optional(),
          followUpCorrespondence: z.string().optional(),
          actionsTaken: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as {
          organisationId: string;
          id: string;
        };
        const { id, submittedDate, ...data } = input;
        return ctx.prisma.careInspectorateNotification.update({
          where: { id, organisationId },
          data: {
            ...data,
            submittedDate: submittedDate ? new Date(submittedDate) : undefined,
            submittedBy: submittedDate ? userId : undefined,
            updatedBy: userId,
          },
        });
      }),
  }),

  // ── Equipment Checks ────────────────────────────────────────────────────────

  equipmentChecks: router({
    list: protectedProcedure
      .input(
        z.object({
          equipmentType: z.nativeEnum(EquipmentType).optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(50),
        })
      )
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        const skip = (input.page - 1) * input.limit;

        const where = {
          organisationId,
          ...(input.equipmentType && { equipmentType: input.equipmentType }),
        };

        const [items, total] = await Promise.all([
          ctx.prisma.equipmentCheck.findMany({
            where,
            skip,
            take: input.limit,
            orderBy: [{ equipmentName: "asc" }, { checkDate: "desc" }],
            include: {
              checkedByUser: { select: { id: true, email: true } },
            },
          }),
          ctx.prisma.equipmentCheck.count({ where }),
        ]);

        return { items, total, page: input.page, limit: input.limit };
      }),

    /**
     * Latest check per (equipmentName, serialNumber) — the "current status" view.
     * Overdue = nextCheckDate in the past.
     */
    listCurrent: protectedProcedure.query(async ({ ctx }) => {
      const { organisationId } = ctx.user as { organisationId: string };

      const allChecks = await ctx.prisma.equipmentCheck.findMany({
        where: { organisationId },
        orderBy: [{ equipmentName: "asc" }, { checkDate: "desc" }],
        include: {
          checkedByUser: { select: { id: true, email: true } },
        },
      });

      // Keep only the latest check per equipment item
      const seen = new Set<string>();
      return allChecks.filter((check) => {
        const key = `${check.equipmentName}|${check.serialNumber ?? ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }),

    create: protectedProcedure
      .input(
        z.object({
          equipmentType: z.nativeEnum(EquipmentType),
          equipmentName: z.string().min(1),
          serialNumber: z.string().optional(),
          location: z.string().optional(),
          checkDate: z.string(), // "YYYY-MM-DD"
          checkResult: z.nativeEnum(CheckResult),
          nextCheckDate: z.string().optional(), // "YYYY-MM-DD"
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as {
          organisationId: string;
          id: string;
        };
        const { checkDate, nextCheckDate, ...rest } = input;
        return ctx.prisma.equipmentCheck.create({
          data: {
            ...rest,
            checkDate: new Date(checkDate),
            nextCheckDate: nextCheckDate ? new Date(nextCheckDate) : undefined,
            organisationId,
            checkedBy: userId,
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }),
  }),

  // ── Legacy flat procedures ──────────────────────────────────────────────────

  /** @deprecated use incidents.safeguarding.list */
  listSafeguarding: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().uuid().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      return ctx.prisma.safeguardingConcern.findMany({
        where: {
          organisationId,
          ...(input.serviceUserId && { serviceUserId: input.serviceUserId }),
        },
        take: input.limit,
        skip: (input.page - 1) * input.limit,
        orderBy: { concernDate: "desc" },
        include: {
          serviceUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    }),

  /** @deprecated use incidents.safeguarding.create */
  createSafeguardingConcern: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().uuid(),
        concernDate: z.date(),
        concernType: z.string(),
        description: z.string().optional(),
        referredTo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      return ctx.prisma.safeguardingConcern.create({
        data: {
          ...input,
          concernType: input.concernType as never,
          organisationId,
          raisedBy: userId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }),
});

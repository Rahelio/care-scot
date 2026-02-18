import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { MedicationStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { requirePermission } from "../middleware/rbac";

const medReadProcedure = protectedProcedure.use(requirePermission("medication.read"));
const medAdminProcedure = protectedProcedure.use(requirePermission("medication.administer"));

export const medicationRouter = router({
  // ── Medications ───────────────────────────

  listForClient: medReadProcedure
    .input(
      z.object({
        serviceUserId: z.string().uuid(),
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
        serviceUserId: z.string().uuid(),
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
        id: z.string().uuid(),
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
        id: z.string().uuid(),
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
        serviceUserId: z.string().uuid(),
        year: z.number().int().min(2020).max(2100),
        month: z.number().int().min(1).max(12),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      // First and last day of the month
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0);

      const [medications, records] = await Promise.all([
        ctx.prisma.serviceUserMedication.findMany({
          where: {
            serviceUserId: input.serviceUserId,
            organisationId,
            // Show active and on-hold; exclude discontinued
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
        serviceUserId: z.string().uuid(),
        medicationId: z.string().uuid(),
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
        witnessId: z.string().uuid().optional(),
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

  // ── Legacy / Errors ───────────────────────

  getMarChart: medReadProcedure
    .input(
      z.object({
        serviceUserId: z.string().uuid(),
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

  reportError: protectedProcedure
    .input(
      z.object({
        serviceUserId: z.string().uuid().optional(),
        errorDate: z.date(),
        errorType: z.string(),
        nccMerpCategory: z.string().optional(),
        description: z.string().optional(),
        actionTaken: z.string().optional(),
        lessonsLearned: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      return ctx.prisma.medicationError.create({
        data: {
          ...input,
          errorType: input.errorType as never,
          nccMerpCategory: input.nccMerpCategory as never,
          organisationId,
          reportedBy: userId,
          reportedDate: new Date(),
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }),
});

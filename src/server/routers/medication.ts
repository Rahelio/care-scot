import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { MedicationStatus } from "@prisma/client";

export const medicationRouter = router({
  listForClient: protectedProcedure
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
        orderBy: { medicationName: "asc" },
      });
    }),

  addMedication: protectedProcedure
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
        startDate: z.date(),
        endDate: z.date().optional(),
        isPrn: z.boolean().default(false),
        prnReason: z.string().optional(),
        prnMaxDose: z.string().optional(),
        isControlledDrug: z.boolean().default(false),
        specialInstructions: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };
      return ctx.prisma.serviceUserMedication.create({
        data: {
          ...input,
          form: input.form as never,
          organisationId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }),

  // ── MAR Chart ─────────────────────────────
  getMarChart: protectedProcedure
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

  recordAdministration: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        administered: z.boolean(),
        administeredAt: z.date().optional(),
        doseGiven: z.string().optional(),
        refused: z.boolean().default(false),
        refusedReason: z.string().optional(),
        notAvailable: z.boolean().default(false),
        notAvailableReason: z.string().optional(),
        prnReasonGiven: z.string().optional(),
        outcomeNotes: z.string().optional(),
        witnessId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user as { id: string };
      const { id, ...data } = input;
      return ctx.prisma.medicationAdminRecord.update({
        where: { id },
        data: {
          ...data,
          administeredBy: userId,
          administeredAt: data.administeredAt ?? new Date(),
          updatedBy: userId,
        },
      });
    }),

  // ── Errors ────────────────────────────────
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

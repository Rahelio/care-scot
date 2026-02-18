import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { StaffStatus, StaffRoleType, EmploymentType, DisclosureLevel, RegistrationType, ReferenceType, TrainingType } from "@prisma/client";
import { requirePermission } from "../middleware/rbac";
import {
  getMandatoryTraining,
  MANDATORY_BY_ROLE,
  TRAINING_LABELS,
  computeTrainingStatus,
  ALL_MANDATORY_TYPES,
} from "../services/staff/training-config";

const staffReadProcedure = protectedProcedure.use(requirePermission("staff.read"));
const staffManageProcedure = protectedProcedure.use(requirePermission("staff.manage"));

const MANDATORY_TRAINING_THRESHOLD = 5;

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
          users: { select: { id: true, email: true, role: true, isActive: true } },
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

  getRecruitmentStatus: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };
      const today = new Date();

      const staff = await ctx.prisma.staffMember.findUniqueOrThrow({
        where: { id: input.id, organisationId },
        include: {
          pvgRecords: true,
          registrations: true,
          references: { select: { referenceReceived: true } },
          healthDeclarations: { take: 1 },
          induction: { select: { inductionStarted: true, inductionCompleted: true } },
          trainingRecords: { select: { isMandatory: true } },
        },
      });

      type CheckItem = { label: string; weight: number; complete: boolean };

      const personalDetailsComplete =
        Boolean(staff.firstName) &&
        Boolean(staff.lastName) &&
        Boolean(staff.dateOfBirth) &&
        Boolean(staff.phone) &&
        Boolean(staff.email);

      const pvgCurrent =
        staff.pvgRecords.length > 0 &&
        staff.pvgRecords.some(
          (r) => r.renewalDate == null || r.renewalDate >= today
        );

      const ssscrCurrent = staff.registrations.some(
        (r) =>
          r.registrationType === "SSSC" &&
          (r.expiryDate == null || r.expiryDate >= today)
      );

      const verifiedRefs = staff.references.filter((r) => r.referenceReceived).length;
      const mandatoryCount = staff.trainingRecords.filter((t) => t.isMandatory).length;

      const checks: CheckItem[] = [
        { label: "Personal details complete", weight: 10, complete: personalDetailsComplete },
        { label: "Right to work verified", weight: 10, complete: staff.rightToWorkChecked },
        { label: "PVG disclosure current", weight: 15, complete: pvgCurrent },
        { label: "SSSC / professional registration current", weight: 15, complete: ssscrCurrent },
        { label: "2+ references verified", weight: 15, complete: verifiedRefs >= 2 },
        { label: "Health declaration on file", weight: 10, complete: staff.healthDeclarations.length > 0 },
        { label: "Induction started", weight: 5, complete: Boolean(staff.induction?.inductionStarted) },
        { label: "Induction completed", weight: 10, complete: Boolean(staff.induction?.inductionCompleted) },
        {
          label: `Mandatory training complete (${mandatoryCount}/${MANDATORY_TRAINING_THRESHOLD})`,
          weight: 10,
          complete: mandatoryCount >= MANDATORY_TRAINING_THRESHOLD,
        },
      ];

      const percentage = checks.reduce((sum, c) => sum + (c.complete ? c.weight : 0), 0);
      const incomplete = checks.filter((c) => !c.complete).map((c) => c.label);

      return { percentage, incomplete, checks };
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
        rightToWorkChecked: z.boolean().optional(),
        rightToWorkDocument: z.string().optional(),
        probationEndDate: z.date().optional(),
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
        dateOfBirth: z.date().optional(),
        jobTitle: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        roleType: z.nativeEnum(StaffRoleType).optional(),
        employmentType: z.nativeEnum(EmploymentType).optional(),
        contractHoursPerWeek: z.number().optional(),
        addressLine1: z.string().optional(),
        addressLine2: z.string().optional(),
        city: z.string().optional(),
        postcode: z.string().optional(),
        rightToWorkChecked: z.boolean().optional(),
        rightToWorkDocument: z.string().optional(),
        probationEndDate: z.date().optional(),
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

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.nativeEnum(StaffStatus),
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

  // ── PVG Records ───────────────────────────
  pvg: router({
    getByStaff: staffReadProcedure
      .input(z.object({ staffMemberId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        return ctx.prisma.staffPvgRecord.findMany({
          where: { staffMemberId: input.staffMemberId, organisationId },
          orderBy: { createdAt: "desc" },
        });
      }),

    create: staffManageProcedure
      .input(
        z.object({
          staffMemberId: z.string().uuid(),
          pvgMembershipNumber: z.string().optional(),
          pvgSchemeRecordDate: z.date().optional(),
          pvgUpdateService: z.boolean().optional(),
          disclosureCertificateNumber: z.string().optional(),
          disclosureDate: z.date().optional(),
          disclosureLevel: z.nativeEnum(DisclosureLevel).optional(),
          renewalDate: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as { organisationId: string; id: string };
        return ctx.prisma.staffPvgRecord.create({
          data: { ...input, organisationId, createdBy: userId, updatedBy: userId },
        });
      }),

    update: staffManageProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          pvgMembershipNumber: z.string().optional(),
          pvgSchemeRecordDate: z.date().optional(),
          pvgUpdateService: z.boolean().optional(),
          disclosureCertificateNumber: z.string().optional(),
          disclosureDate: z.date().optional(),
          disclosureLevel: z.nativeEnum(DisclosureLevel).optional(),
          renewalDate: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as { organisationId: string; id: string };
        const { id, ...data } = input;
        const record = await ctx.prisma.staffPvgRecord.findUniqueOrThrow({
          where: { id },
          select: { organisationId: true },
        });
        if (record.organisationId !== organisationId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return ctx.prisma.staffPvgRecord.update({
          where: { id },
          data: { ...data, updatedBy: userId },
        });
      }),
  }),

  // ── Registrations ─────────────────────────
  registration: router({
    getByStaff: staffReadProcedure
      .input(z.object({ staffMemberId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        return ctx.prisma.staffRegistration.findMany({
          where: { staffMemberId: input.staffMemberId, organisationId },
          orderBy: { createdAt: "desc" },
        });
      }),

    create: staffManageProcedure
      .input(
        z.object({
          staffMemberId: z.string().uuid(),
          registrationType: z.nativeEnum(RegistrationType),
          registrationNumber: z.string().optional(),
          registrationCategory: z.string().optional(),
          expiryDate: z.date().optional(),
          qualificationName: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as { organisationId: string; id: string };
        return ctx.prisma.staffRegistration.create({
          data: { ...input, organisationId, createdBy: userId, updatedBy: userId },
        });
      }),

    update: staffManageProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          registrationType: z.nativeEnum(RegistrationType).optional(),
          registrationNumber: z.string().optional(),
          registrationCategory: z.string().optional(),
          expiryDate: z.date().optional(),
          qualificationName: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as { organisationId: string; id: string };
        const { id, ...data } = input;
        const record = await ctx.prisma.staffRegistration.findUniqueOrThrow({
          where: { id },
          select: { organisationId: true },
        });
        if (record.organisationId !== organisationId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return ctx.prisma.staffRegistration.update({
          where: { id },
          data: { ...data, updatedBy: userId },
        });
      }),
  }),

  // ── References ────────────────────────────
  reference: router({
    getByStaff: staffReadProcedure
      .input(z.object({ staffMemberId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        return ctx.prisma.staffReference.findMany({
          where: { staffMemberId: input.staffMemberId, organisationId },
          orderBy: { createdAt: "desc" },
        });
      }),

    create: staffManageProcedure
      .input(
        z.object({
          staffMemberId: z.string().uuid(),
          refereeName: z.string().min(1),
          refereeOrganisation: z.string().optional(),
          refereeRole: z.string().optional(),
          refereeContact: z.string().optional(),
          referenceType: z.nativeEnum(ReferenceType),
          referenceReceived: z.boolean().optional(),
          referenceDate: z.date().optional(),
          employmentGapExplanation: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as { organisationId: string; id: string };
        return ctx.prisma.staffReference.create({
          data: { ...input, organisationId, createdBy: userId, updatedBy: userId },
        });
      }),

    update: staffManageProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          refereeName: z.string().min(1).optional(),
          refereeOrganisation: z.string().optional(),
          refereeRole: z.string().optional(),
          refereeContact: z.string().optional(),
          referenceType: z.nativeEnum(ReferenceType).optional(),
          referenceReceived: z.boolean().optional(),
          referenceDate: z.date().optional(),
          referenceVerifiedBy: z.string().uuid().optional(),
          employmentGapExplanation: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as { organisationId: string; id: string };
        const { id, ...data } = input;
        const record = await ctx.prisma.staffReference.findUniqueOrThrow({
          where: { id },
          select: { organisationId: true },
        });
        if (record.organisationId !== organisationId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return ctx.prisma.staffReference.update({
          where: { id },
          data: { ...data, updatedBy: userId },
        });
      }),
  }),

  // ── Health Declarations ───────────────────
  health: router({
    getByStaff: staffReadProcedure
      .input(z.object({ staffMemberId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        return ctx.prisma.staffHealthDeclaration.findMany({
          where: { staffMemberId: input.staffMemberId, organisationId },
          orderBy: { declarationDate: "desc" },
        });
      }),

    create: staffManageProcedure
      .input(
        z.object({
          staffMemberId: z.string().uuid(),
          declarationDate: z.date(),
          fitToWork: z.boolean(),
          ohAssessmentRequired: z.boolean().optional(),
          ohAssessmentDate: z.date().optional(),
          immunisations: z
            .object({
              hepatitisB: z.string().optional(),
              covid: z.string().optional(),
              flu: z.string().optional(),
            })
            .optional(),
          fitnessToWorkDate: z.date().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as { organisationId: string; id: string };
        return ctx.prisma.staffHealthDeclaration.create({
          data: { ...input, organisationId, createdBy: userId, updatedBy: userId },
        });
      }),

    update: staffManageProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          declarationDate: z.date().optional(),
          fitToWork: z.boolean().optional(),
          ohAssessmentRequired: z.boolean().optional(),
          ohAssessmentDate: z.date().optional(),
          immunisations: z
            .object({
              hepatitisB: z.string().optional(),
              covid: z.string().optional(),
              flu: z.string().optional(),
            })
            .optional(),
          fitnessToWorkDate: z.date().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as { organisationId: string; id: string };
        const { id, ...data } = input;
        const record = await ctx.prisma.staffHealthDeclaration.findUniqueOrThrow({
          where: { id },
          select: { organisationId: true },
        });
        if (record.organisationId !== organisationId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return ctx.prisma.staffHealthDeclaration.update({
          where: { id },
          data: { ...data, updatedBy: userId },
        });
      }),
  }),

  // ── Training Records ──────────────────────
  training: router({
    getByStaff: staffReadProcedure
      .input(z.object({ staffMemberId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        const staff = await ctx.prisma.staffMember.findUniqueOrThrow({
          where: { id: input.staffMemberId, organisationId },
          select: { roleType: true },
        });
        const records = await ctx.prisma.staffTrainingRecord.findMany({
          where: { staffMemberId: input.staffMemberId, organisationId },
          orderBy: { completionDate: "desc" },
        });
        return { records, mandatory: getMandatoryTraining(staff.roleType) };
      }),

    create: staffManageProcedure
      .input(
        z.object({
          staffMemberId: z.string().uuid(),
          trainingType: z.nativeEnum(TrainingType),
          trainingName: z.string().min(1),
          trainingProvider: z.string().optional(),
          completionDate: z.date(),
          expiryDate: z.date().optional(),
          isMandatory: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as { organisationId: string; id: string };
        return ctx.prisma.staffTrainingRecord.create({
          data: { ...input, organisationId, createdBy: userId, updatedBy: userId },
        });
      }),

    update: staffManageProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          trainingType: z.nativeEnum(TrainingType).optional(),
          trainingName: z.string().min(1).optional(),
          trainingProvider: z.string().optional(),
          completionDate: z.date().optional(),
          expiryDate: z.date().optional(),
          isMandatory: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { organisationId, id: userId } = ctx.user as { organisationId: string; id: string };
        const { id, ...data } = input;
        const record = await ctx.prisma.staffTrainingRecord.findUniqueOrThrow({
          where: { id },
          select: { organisationId: true },
        });
        if (record.organisationId !== organisationId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return ctx.prisma.staffTrainingRecord.update({
          where: { id },
          data: { ...data, updatedBy: userId },
        });
      }),

    getMatrix: staffReadProcedure
      .input(
        z.object({
          roleType: z.nativeEnum(StaffRoleType).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };

        const staff = await ctx.prisma.staffMember.findMany({
          where: {
            organisationId,
            status: "ACTIVE",
            ...(input.roleType && { roleType: input.roleType }),
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            roleType: true,
            jobTitle: true,
            trainingRecords: {
              select: {
                id: true,
                trainingType: true,
                completionDate: true,
                expiryDate: true,
                isMandatory: true,
                trainingName: true,
              },
              orderBy: { completionDate: "desc" },
            },
          },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        });

        // Columns = union of mandatory types for visible roles
        const visibleRoles = input.roleType
          ? [input.roleType]
          : (Object.keys(MANDATORY_BY_ROLE) as StaffRoleType[]);
        const columns: TrainingType[] = [
          ...new Set(visibleRoles.flatMap((r) => MANDATORY_BY_ROLE[r])),
        ];

        return {
          staff: staff.map((s) => ({
            ...s,
            mandatory: getMandatoryTraining(s.roleType),
          })),
          columns,
        };
      }),

    getExpiring: staffReadProcedure
      .input(
        z.object({
          withinDays: z.number().min(1).max(365).default(90),
        })
      )
      .query(async ({ ctx, input }) => {
        const { organisationId } = ctx.user as { organisationId: string };
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const cutoff = new Date(today);
        cutoff.setDate(cutoff.getDate() + input.withinDays);

        function daysUntil(date: Date) {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }

        const staffFilter = {
          organisationId,
          staffMember: { status: { not: "LEFT" as const } },
        };

        const [trainingRecords, pvgRecords, registrationRecords] = await Promise.all([
          ctx.prisma.staffTrainingRecord.findMany({
            where: { ...staffFilter, expiryDate: { lte: cutoff } },
            include: {
              staffMember: {
                select: { id: true, firstName: true, lastName: true, roleType: true, status: true },
              },
            },
            orderBy: { expiryDate: "asc" },
          }),
          ctx.prisma.staffPvgRecord.findMany({
            where: { ...staffFilter, renewalDate: { lte: cutoff, not: null } },
            include: {
              staffMember: {
                select: { id: true, firstName: true, lastName: true, roleType: true, status: true },
              },
            },
            orderBy: { renewalDate: "asc" },
          }),
          ctx.prisma.staffRegistration.findMany({
            where: { ...staffFilter, expiryDate: { lte: cutoff, not: null } },
            include: {
              staffMember: {
                select: { id: true, firstName: true, lastName: true, roleType: true, status: true },
              },
            },
            orderBy: { expiryDate: "asc" },
          }),
        ]);

        const items = [
          ...trainingRecords.map((t) => ({
            type: "training" as const,
            staffId: t.staffMember.id,
            staffName: `${t.staffMember.firstName} ${t.staffMember.lastName}`,
            roleType: t.staffMember.roleType,
            staffStatus: t.staffMember.status,
            label: TRAINING_LABELS[t.trainingType] ?? t.trainingName,
            trainingType: t.trainingType as TrainingType | null,
            expiryDate: t.expiryDate as Date,
            daysUntilExpiry: daysUntil(t.expiryDate as Date),
          })),
          ...pvgRecords
            .filter((p) => p.renewalDate != null)
            .map((p) => ({
              type: "pvg" as const,
              staffId: p.staffMember.id,
              staffName: `${p.staffMember.firstName} ${p.staffMember.lastName}`,
              roleType: p.staffMember.roleType,
              staffStatus: p.staffMember.status,
              label: "PVG Renewal",
              trainingType: null as TrainingType | null,
              expiryDate: p.renewalDate as Date,
              daysUntilExpiry: daysUntil(p.renewalDate as Date),
            })),
          ...registrationRecords
            .filter((r) => r.expiryDate != null)
            .map((r) => ({
              type: "registration" as const,
              staffId: r.staffMember.id,
              staffName: `${r.staffMember.firstName} ${r.staffMember.lastName}`,
              roleType: r.staffMember.roleType,
              staffStatus: r.staffMember.status,
              label: `${r.registrationType} Registration`,
              trainingType: null as TrainingType | null,
              expiryDate: r.expiryDate as Date,
              daysUntilExpiry: daysUntil(r.expiryDate as Date),
            })),
        ].sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

        return items;
      }),
  }),
});

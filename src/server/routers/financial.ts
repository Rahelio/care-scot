import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { requirePermission } from "../middleware/rbac";
import { OrgScopedPrismaClient } from "../middleware/org-scope";
import {
  FunderType,
  BillingTimeBasis,
  InvoiceFrequency,
  DayType,
  DayOfWeek,
  CarePackageStatus,
  BillableVisitStatus,
  InvoiceStatus,
  CreditNoteStatus,
  HolidayRegion,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { lookupRate } from "../services/financial/rate-lookup";
import { calculateBillingDuration } from "../services/financial/billing-calculator";

// ─────────────────────────────────────────────
// Funders
// ─────────────────────────────────────────────

const fundersRouter = router({
  list: protectedProcedure
    .use(requirePermission("clients.read"))
    .input(
      z.object({
        search: z.string().optional(),
        funderType: z.nativeEnum(FunderType).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.funder.findMany({
        where: {
          ...(input.search && {
            name: { contains: input.search, mode: "insensitive" as const },
          }),
          ...(input.funderType && { funderType: input.funderType }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
        orderBy: { name: "asc" },
      });
    }),

  getById: protectedProcedure
    .use(requirePermission("clients.read"))
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.funder.findFirstOrThrow({
        where: { id: input.id },
        include: { rateCards: { where: { isActive: true }, orderBy: { effectiveFrom: "desc" } } },
      });
    }),

  create: protectedProcedure
    .use(requirePermission("settings.manage"))
    .input(
      z.object({
        name: z.string().min(1),
        funderType: z.nativeEnum(FunderType),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional().or(z.literal("")),
        contactPhone: z.string().optional(),
        addressLine1: z.string().optional(),
        addressLine2: z.string().optional(),
        city: z.string().optional(),
        postcode: z.string().optional(),
        paymentTermsDays: z.number().int().min(0).default(30),
        invoiceFrequency: z.nativeEnum(InvoiceFrequency).default("MONTHLY"),
        billingTimeBasis: z.nativeEnum(BillingTimeBasis).default("SCHEDULED"),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organisationId;
      return ctx.db.funder.create({
        data: {
          ...input,
          organisationId: orgId,
          contactEmail: input.contactEmail || null,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        },
      });
    }),

  update: protectedProcedure
    .use(requirePermission("settings.manage"))
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).optional(),
        funderType: z.nativeEnum(FunderType).optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional().or(z.literal("")),
        contactPhone: z.string().optional(),
        addressLine1: z.string().optional(),
        addressLine2: z.string().optional(),
        city: z.string().optional(),
        postcode: z.string().optional(),
        paymentTermsDays: z.number().int().min(0).optional(),
        invoiceFrequency: z.nativeEnum(InvoiceFrequency).optional(),
        billingTimeBasis: z.nativeEnum(BillingTimeBasis).optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.funder.update({
        where: { id },
        data: {
          ...data,
          contactEmail: data.contactEmail || null,
          updatedBy: ctx.user.id,
        },
      });
    }),
});

// ─────────────────────────────────────────────
// Rate Cards
// ─────────────────────────────────────────────

const rateLineSchema = z.object({
  dayType: z.nativeEnum(DayType),
  timeBandStart: z.string().nullable().optional(),
  timeBandEnd: z.string().nullable().optional(),
  ratePerHour: z.string().min(1),
  carersRequired: z.number().int().min(1).default(1),
  description: z.string().optional(),
});

const rateCardsRouter = router({
  list: protectedProcedure
    .use(requirePermission("settings.manage"))
    .input(
      z.object({
        funderId: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.rateCard.findMany({
        where: {
          ...(input.funderId && { funderId: input.funderId }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
        include: {
          funder: { select: { id: true, name: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { effectiveFrom: "desc" },
      });
    }),

  getById: protectedProcedure
    .use(requirePermission("settings.manage"))
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.rateCard.findFirstOrThrow({
        where: { id: input.id },
        include: {
          funder: { select: { id: true, name: true } },
          lines: { orderBy: [{ dayType: "asc" }, { carersRequired: "asc" }] },
          mileageRates: true,
        },
      });
    }),

  create: protectedProcedure
    .use(requirePermission("settings.manage"))
    .input(
      z.object({
        funderId: z.string().nullable().optional(),
        name: z.string().min(1),
        effectiveFrom: z.string().min(1),
        effectiveTo: z.string().nullable().optional(),
        notes: z.string().optional(),
        lines: z.array(rateLineSchema),
        mileageRatePerMile: z.string().optional(),
        mileageDescription: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { lines, mileageRatePerMile, mileageDescription, ...cardData } =
        input;
      const orgId = ctx.user.organisationId;
      return ctx.db.rateCard.create({
        data: {
          ...cardData,
          organisationId: orgId,
          funderId: cardData.funderId || null,
          effectiveFrom: new Date(cardData.effectiveFrom),
          effectiveTo: cardData.effectiveTo
            ? new Date(cardData.effectiveTo)
            : null,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
          lines: {
            create: lines.map((l) => ({
              organisationId: ctx.user.organisationId,
              dayType: l.dayType,
              timeBandStart: l.timeBandStart || null,
              timeBandEnd: l.timeBandEnd || null,
              ratePerHour: new Decimal(l.ratePerHour),
              carersRequired: l.carersRequired,
              description: l.description,
            })),
          },
          ...(mileageRatePerMile && {
            mileageRates: {
              create: {
                organisationId: ctx.user.organisationId,
                ratePerMile: new Decimal(mileageRatePerMile),
                description: mileageDescription,
              },
            },
          }),
        },
        include: { lines: true, mileageRates: true },
      });
    }),

  update: protectedProcedure
    .use(requirePermission("settings.manage"))
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).optional(),
        funderId: z.string().nullable().optional(),
        effectiveFrom: z.string().optional(),
        effectiveTo: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.rateCard.update({
        where: { id },
        data: {
          ...data,
          ...(data.effectiveFrom && {
            effectiveFrom: new Date(data.effectiveFrom),
          }),
          ...(data.effectiveTo !== undefined && {
            effectiveTo: data.effectiveTo
              ? new Date(data.effectiveTo)
              : null,
          }),
          updatedBy: ctx.user.id,
        },
      });
    }),

  addLine: protectedProcedure
    .use(requirePermission("settings.manage"))
    .input(
      z.object({
        rateCardId: z.string().min(1),
        ...rateLineSchema.shape,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { rateCardId, ...lineData } = input;
      const orgId = ctx.user.organisationId;
      return ctx.db.rateCardLine.create({
        data: {
          rateCardId,
          organisationId: orgId,
          dayType: lineData.dayType,
          timeBandStart: lineData.timeBandStart || null,
          timeBandEnd: lineData.timeBandEnd || null,
          ratePerHour: new Decimal(lineData.ratePerHour),
          carersRequired: lineData.carersRequired,
          description: lineData.description,
        },
      });
    }),

  updateLine: protectedProcedure
    .use(requirePermission("settings.manage"))
    .input(
      z.object({
        id: z.string().min(1),
        dayType: z.nativeEnum(DayType).optional(),
        timeBandStart: z.string().nullable().optional(),
        timeBandEnd: z.string().nullable().optional(),
        ratePerHour: z.string().optional(),
        carersRequired: z.number().int().min(1).optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.rateCardLine.update({
        where: { id },
        data: {
          ...data,
          ...(data.ratePerHour && {
            ratePerHour: new Decimal(data.ratePerHour),
          }),
        },
      });
    }),

  removeLine: protectedProcedure
    .use(requirePermission("settings.manage"))
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.rateCardLine.delete({ where: { id: input.id } });
    }),

  duplicate: protectedProcedure
    .use(requirePermission("settings.manage"))
    .input(
      z.object({
        id: z.string().min(1),
        newName: z.string().min(1),
        effectiveFrom: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.rateCard.findFirstOrThrow({
        where: { id: input.id },
        include: { lines: true, mileageRates: true },
      });

      const orgId = ctx.user.organisationId;
      return ctx.db.rateCard.create({
        data: {
          organisationId: orgId,
          funderId: source.funderId,
          name: input.newName,
          effectiveFrom: new Date(input.effectiveFrom),
          notes: source.notes,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
          lines: {
            create: source.lines.map((l) => ({
              organisationId: ctx.user.organisationId,
              dayType: l.dayType,
              timeBandStart: l.timeBandStart,
              timeBandEnd: l.timeBandEnd,
              ratePerHour: l.ratePerHour,
              carersRequired: l.carersRequired,
              description: l.description,
            })),
          },
          mileageRates: {
            create: source.mileageRates.map((m) => ({
              organisationId: ctx.user.organisationId,
              ratePerMile: m.ratePerMile,
              description: m.description,
            })),
          },
        },
        include: { lines: true, mileageRates: true },
      });
    }),
});

// ─────────────────────────────────────────────
// Bank Holidays
// ─────────────────────────────────────────────

const bankHolidaysRouter = router({
  list: protectedProcedure
    .use(requirePermission("settings.manage"))
    .input(z.object({ year: z.number().int().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.bankHoliday.findMany({
        where: {
          ...(input.year && {
            holidayDate: {
              gte: new Date(`${input.year}-01-01`),
              lte: new Date(`${input.year}-12-31`),
            },
          }),
        },
        orderBy: { holidayDate: "asc" },
      });
    }),

  create: protectedProcedure
    .use(requirePermission("settings.manage"))
    .input(
      z.object({
        holidayDate: z.string().min(1),
        name: z.string().min(1),
        appliesTo: z.nativeEnum(HolidayRegion).default("SCOTLAND"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.bankHoliday.create({
        data: {
          organisationId: ctx.user.organisationId,
          holidayDate: new Date(input.holidayDate),
          name: input.name,
          appliesTo: input.appliesTo,
        },
      });
    }),

  createMany: protectedProcedure
    .use(requirePermission("settings.manage"))
    .input(
      z.object({
        holidays: z.array(
          z.object({
            holidayDate: z.string().min(1),
            name: z.string().min(1),
            appliesTo: z.nativeEnum(HolidayRegion).default("SCOTLAND"),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.user.organisationId;
      return ctx.db.bankHoliday.createMany({
        data: input.holidays.map((h) => ({
          organisationId: orgId,
          holidayDate: new Date(h.holidayDate),
          name: h.name,
          appliesTo: h.appliesTo,
        })),
        skipDuplicates: true,
      });
    }),

  delete: protectedProcedure
    .use(requirePermission("settings.manage"))
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.bankHoliday.delete({ where: { id: input.id } });
    }),
});

// ─────────────────────────────────────────────
// Care Packages
// ─────────────────────────────────────────────

const carePackagesRouter = router({
  getByServiceUser: protectedProcedure
    .use(requirePermission("clients.read"))
    .input(z.object({ serviceUserId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.carePackage.findMany({
        where: { serviceUserId: input.serviceUserId },
        include: {
          funder: { select: { id: true, name: true, funderType: true } },
          rateCard: { select: { id: true, name: true } },
        },
        orderBy: { startDate: "desc" },
      });
    }),

  getById: protectedProcedure
    .use(requirePermission("clients.read"))
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.carePackage.findFirstOrThrow({
        where: { id: input.id },
        include: {
          funder: true,
          rateCard: { include: { lines: true, mileageRates: true } },
          serviceUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    }),

  create: protectedProcedure
    .use(requirePermission("clients.create"))
    .input(
      z.object({
        serviceUserId: z.string().min(1),
        funderId: z.string().min(1),
        rateCardId: z.string().min(1),
        packageName: z.string().min(1),
        funderReference: z.string().optional(),
        billingTimeBasis: z.nativeEnum(BillingTimeBasis).default("SCHEDULED"),
        roundingIncrementMinutes: z.number().int().min(1).default(15),
        minimumBillableMinutes: z.number().int().min(0).default(15),
        mileageBillable: z.boolean().default(false),
        startDate: z.string().min(1),
        endDate: z.string().nullable().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.carePackage.create({
        data: {
          ...input,
          organisationId: ctx.user.organisationId,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : null,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        },
      });
    }),

  update: protectedProcedure
    .use(requirePermission("clients.update"))
    .input(
      z.object({
        id: z.string().min(1),
        funderId: z.string().min(1).optional(),
        rateCardId: z.string().min(1).optional(),
        packageName: z.string().min(1).optional(),
        funderReference: z.string().optional(),
        billingTimeBasis: z.nativeEnum(BillingTimeBasis).optional(),
        roundingIncrementMinutes: z.number().int().min(1).optional(),
        minimumBillableMinutes: z.number().int().min(0).optional(),
        mileageBillable: z.boolean().optional(),
        startDate: z.string().optional(),
        endDate: z.string().nullable().optional(),
        notes: z.string().optional(),
        status: z.nativeEnum(CarePackageStatus).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.carePackage.update({
        where: { id },
        data: {
          ...data,
          ...(data.startDate && { startDate: new Date(data.startDate) }),
          ...(data.endDate !== undefined && {
            endDate: data.endDate ? new Date(data.endDate) : null,
          }),
          updatedBy: ctx.user.id,
        },
      });
    }),

  end: protectedProcedure
    .use(requirePermission("clients.update"))
    .input(
      z.object({
        id: z.string().min(1),
        endDate: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.carePackage.update({
        where: { id: input.id },
        data: {
          endDate: new Date(input.endDate),
          status: "ENDED",
          updatedBy: ctx.user.id,
        },
      });
    }),
});

// ─────────────────────────────────────────────
// Reconciliation
// ─────────────────────────────────────────────

function determineDayType(
  date: Date,
  bankHolidayDates: Set<string>,
): DayType {
  const dateStr = date.toISOString().split("T")[0];
  if (bankHolidayDates.has(dateStr)) return "BANK_HOLIDAY";
  const day = date.getDay(); // 0=Sun, 6=Sat
  if (day === 0) return "SUNDAY";
  if (day === 6) return "SATURDAY";
  return "WEEKDAY";
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

const DOW_MAP: DayOfWeek[] = [
  "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY",
];
function getScheduleDayOfWeek(date: Date): DayOfWeek {
  return DOW_MAP[date.getDay()];
}

const reconciliationRouter = router({
  generate: protectedProcedure
    .use(requirePermission("reports.view_all"))
    .input(
      z.object({
        periodStart: z.string().min(1),
        periodEnd: z.string().min(1),
        funderId: z.string().optional(),
        serviceUserId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const startDate = new Date(input.periodStart);
      const endDate = new Date(input.periodEnd);

      // Fetch bank holidays for the period
      const bankHolidays = await ctx.db.bankHoliday.findMany({
        where: {
          holidayDate: { gte: startDate, lte: endDate },
        },
      });
      const bhDates = new Set(
        bankHolidays.map((h) => h.holidayDate.toISOString().split("T")[0]),
      );

      // Find care visits in period that have a care package and no billable visit
      const visits = await ctx.db.careVisitRecord.findMany({
        where: {
          visitDate: { gte: startDate, lte: endDate },
          carePackageId: { not: null },
          billableVisit: null,
          ...(input.serviceUserId && {
            serviceUserId: input.serviceUserId,
          }),
        },
        include: {
          carePackage: {
            include: {
              rateCard: { include: { lines: true, mileageRates: true } },
              funder: { select: { id: true, name: true } },
            },
          },
          serviceUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      // Filter by funder if specified
      const filtered = input.funderId
        ? visits.filter((v) => v.carePackage?.funderId === input.funderId)
        : visits;

      // Fetch active visit schedules for all packages in this batch so we can
      // resolve carersRequired per slot rather than using the package-level default.
      const packageIds = [...new Set(filtered.map((v) => v.carePackageId!))];
      const allSchedules = await ctx.db.visitSchedule.findMany({
        where: { carePackageId: { in: packageIds }, isActive: true },
      });
      const schedulesByPackage = new Map<string, typeof allSchedules>();
      for (const s of allSchedules) {
        const list = schedulesByPackage.get(s.carePackageId) ?? [];
        list.push(s);
        schedulesByPackage.set(s.carePackageId, list);
      }

      const created: string[] = [];
      const issues: { visitId: string; reason: string }[] = [];

      for (const visit of filtered) {
        const pkg = visit.carePackage!;
        const dayType = determineDayType(visit.visitDate, bhDates);

        // Resolve carers from the matching VisitSchedule (scheduling is source of
        // truth). Match on dayOfWeek + startTime; if no exact match, fall back to
        // same-day schedule, then to the package-level default.
        const visitDow = getScheduleDayOfWeek(visit.visitDate);
        const pkgSchedules = schedulesByPackage.get(pkg.id) ?? [];
        const matchedSchedule =
          pkgSchedules.find(
            (s) =>
              s.dayOfWeek === visitDow &&
              s.startTime === formatTime(visit.scheduledStart),
          ) ?? pkgSchedules.find((s) => s.dayOfWeek === visitDow);
        const carersRequired =
          matchedSchedule?.carersRequired ?? pkg.carersRequired;

        // Determine billing start/end based on billing time basis
        const useActual = pkg.billingTimeBasis === "ACTUAL";
        const billingStart =
          useActual && visit.actualStart
            ? visit.actualStart
            : visit.scheduledStart;
        const billingEnd =
          useActual && visit.actualEnd ? visit.actualEnd : visit.scheduledEnd;

        if (!billingStart || !billingEnd) {
          issues.push({
            visitId: visit.id,
            reason: "Missing start/end times for billing calculation",
          });
          continue;
        }

        // Calculate billing duration
        const billingDurationMinutes = calculateBillingDuration(
          billingStart,
          billingEnd,
          pkg.minimumBillableMinutes,
          pkg.roundingIncrementMinutes,
        );

        // Lookup rate
        const ratePerHour = lookupRate(
          pkg.rateCard.lines,
          dayType,
          formatTime(billingStart),
          carersRequired,
        );

        if (!ratePerHour) {
          issues.push({
            visitId: visit.id,
            reason: `No rate found for ${dayType}, ${formatTime(billingStart)}, ${carersRequired} carer(s)`,
          });
          continue;
        }

        // Calculate care total: (duration/60) * rate * carers
        const hours = billingDurationMinutes / 60;
        const lineTotal = new Decimal(hours)
          .mul(ratePerHour)
          .mul(carersRequired)
          .toDecimalPlaces(2);

        // Calculate mileage
        let mileageTotal: Decimal | null = null;
        let mileageRate: Decimal | null = null;
        const mileageMiles = visit.mileageMiles;
        if (pkg.mileageBillable && mileageMiles && pkg.rateCard.mileageRates.length > 0) {
          mileageRate = pkg.rateCard.mileageRates[0].ratePerMile;
          mileageTotal = new Decimal(Number(mileageMiles))
            .mul(mileageRate)
            .toDecimalPlaces(2);
        }

        const visitTotal = lineTotal.add(mileageTotal || new Decimal(0));

        await ctx.db.billableVisit.create({
          data: {
            organisationId: ctx.user.organisationId,
            careVisitRecordId: visit.id,
            carePackageId: pkg.id,
            serviceUserId: visit.serviceUserId,
            visitDate: visit.visitDate,
            scheduledStart: visit.scheduledStart,
            scheduledEnd: visit.scheduledEnd,
            actualStart: visit.actualStart,
            actualEnd: visit.actualEnd,
            billingStart,
            billingEnd,
            billingDurationMinutes,
            carersRequired,
            dayType,
            appliedRatePerHour: ratePerHour,
            lineTotal,
            mileageMiles: mileageMiles,
            mileageRate,
            mileageTotal,
            visitTotal,
            status: "PENDING",
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          },
        });

        created.push(visit.id);
      }

      return {
        generated: created.length,
        issues,
        total: filtered.length,
      };
    }),

  list: protectedProcedure
    .use(requirePermission("reports.view_all"))
    .input(
      z.object({
        periodStart: z.string().optional(),
        periodEnd: z.string().optional(),
        funderId: z.string().optional(),
        serviceUserId: z.string().optional(),
        dayType: z.nativeEnum(DayType).optional(),
        status: z.nativeEnum(BillableVisitStatus).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(200).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      const where = {
        ...(input.periodStart &&
          input.periodEnd && {
            visitDate: {
              gte: new Date(input.periodStart),
              lte: new Date(input.periodEnd),
            },
          }),
        ...(input.funderId && {
          carePackage: { funderId: input.funderId },
        }),
        ...(input.serviceUserId && {
          serviceUserId: input.serviceUserId,
        }),
        ...(input.dayType && { dayType: input.dayType }),
        ...(input.status && { status: input.status }),
      };

      const [items, total] = await Promise.all([
        ctx.db.billableVisit.findMany({
          where,
          include: {
            serviceUser: {
              select: { id: true, firstName: true, lastName: true },
            },
            carePackage: {
              select: {
                id: true,
                packageName: true,
                funder: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: [{ visitDate: "desc" }, { billingStart: "desc" }],
          skip,
          take: input.limit,
        }),
        ctx.db.billableVisit.count({ where }),
      ]);

      return { items, total, page: input.page, limit: input.limit };
    }),

  getById: protectedProcedure
    .use(requirePermission("reports.view_all"))
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.billableVisit.findFirstOrThrow({
        where: { id: input.id },
        include: {
          serviceUser: {
            select: { id: true, firstName: true, lastName: true },
          },
          carePackage: {
            include: {
              funder: { select: { id: true, name: true } },
              rateCard: { select: { id: true, name: true } },
            },
          },
          careVisitRecord: true,
          approvedBy: { select: { id: true, name: true, email: true } },
        },
      });
    }),

  approve: protectedProcedure
    .use(requirePermission("audits.manage"))
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.billableVisit.update({
        where: { id: input.id },
        data: {
          status: "APPROVED",
          approvedById: ctx.user.id,
          approvedAt: new Date(),
          updatedBy: ctx.user.id,
        },
      });
    }),

  bulkApprove: protectedProcedure
    .use(requirePermission("audits.manage"))
    .input(
      z.object({
        ids: z.array(z.string().min(1)).optional(),
        periodStart: z.string().optional(),
        periodEnd: z.string().optional(),
        funderId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const where = {
        status: "PENDING" as BillableVisitStatus,
        ...(input.ids && { id: { in: input.ids } }),
        ...(input.periodStart &&
          input.periodEnd && {
            visitDate: {
              gte: new Date(input.periodStart),
              lte: new Date(input.periodEnd),
            },
          }),
        ...(input.funderId && {
          carePackage: { funderId: input.funderId },
        }),
      };

      return ctx.db.billableVisit.updateMany({
        where,
        data: {
          status: "APPROVED",
          approvedById: ctx.user.id,
          approvedAt: new Date(),
          updatedBy: ctx.user.id,
        },
      });
    }),

  dispute: protectedProcedure
    .use(requirePermission("audits.manage"))
    .input(
      z.object({
        id: z.string().min(1),
        reason: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.billableVisit.update({
        where: { id: input.id },
        data: {
          status: "DISPUTED",
          disputeReason: input.reason,
          updatedBy: ctx.user.id,
        },
      });
    }),

  override: protectedProcedure
    .use(requirePermission("audits.manage"))
    .input(
      z.object({
        id: z.string().min(1),
        overrideAmount: z.string().min(1),
        reason: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const overrideDecimal = new Decimal(input.overrideAmount);
      return ctx.db.billableVisit.update({
        where: { id: input.id },
        data: {
          overrideAmount: overrideDecimal,
          overrideReason: input.reason,
          visitTotal: overrideDecimal,
          status: "APPROVED",
          approvedById: ctx.user.id,
          approvedAt: new Date(),
          updatedBy: ctx.user.id,
        },
      });
    }),

  void: protectedProcedure
    .use(requirePermission("audits.manage"))
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.billableVisit.update({
        where: { id: input.id },
        data: { status: "VOID", updatedBy: ctx.user.id },
      });
    }),

  getSummary: protectedProcedure
    .use(requirePermission("reports.view_all"))
    .input(
      z.object({
        periodStart: z.string().min(1),
        periodEnd: z.string().min(1),
        funderId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        visitDate: {
          gte: new Date(input.periodStart),
          lte: new Date(input.periodEnd),
        },
        status: { not: "VOID" as BillableVisitStatus },
        ...(input.funderId && {
          carePackage: { funderId: input.funderId },
        }),
      };

      const visits = await ctx.db.billableVisit.findMany({
        where,
        select: {
          dayType: true,
          billingDurationMinutes: true,
          visitTotal: true,
          status: true,
        },
      });

      const totalVisits = visits.length;
      const totalMinutes = visits.reduce(
        (sum, v) => sum + v.billingDurationMinutes,
        0,
      );
      const totalAmount = visits.reduce(
        (sum, v) => sum.add(v.visitTotal),
        new Decimal(0),
      );

      const byDayType = Object.values(DayType).map((dt) => {
        const dtVisits = visits.filter((v) => v.dayType === dt);
        return {
          dayType: dt,
          count: dtVisits.length,
          minutes: dtVisits.reduce(
            (sum, v) => sum + v.billingDurationMinutes,
            0,
          ),
          total: dtVisits.reduce(
            (sum, v) => sum.add(v.visitTotal),
            new Decimal(0),
          ),
        };
      });

      const byStatus = Object.values(BillableVisitStatus).map((st) => ({
        status: st,
        count: visits.filter((v) => v.status === st).length,
      }));

      return {
        totalVisits,
        totalHours: Math.round((totalMinutes / 60) * 100) / 100,
        totalAmount,
        byDayType,
        byStatus,
      };
    }),
});

// ─────────────────────────────────────────────
// Invoices
// ─────────────────────────────────────────────

async function generateInvoiceNumber(
  db: OrgScopedPrismaClient,
  organisationId: string,
  prefix: string | null,
): Promise<string> {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const pfx = prefix || "INV";
  const pattern = `INV-${pfx}-${ym}-`;

  // Find the latest invoice number for this org+month
  const latest = await db.invoice.findFirst({
    where: {
      organisationId,
      invoiceNumber: { startsWith: pattern },
    },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });

  let seq = 1;
  if (latest) {
    const lastSeq = parseInt(latest.invoiceNumber.split("-").pop() || "0", 10);
    seq = lastSeq + 1;
  }

  return `${pattern}${String(seq).padStart(4, "0")}`;
}

async function generateCreditNoteNumber(
  db: OrgScopedPrismaClient,
  organisationId: string,
  prefix: string | null,
): Promise<string> {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const pfx = prefix || "INV";
  const pattern = `CN-${pfx}-${ym}-`;

  const latest = await db.creditNote.findFirst({
    where: {
      organisationId,
      creditNoteNumber: { startsWith: pattern },
    },
    orderBy: { creditNoteNumber: "desc" },
    select: { creditNoteNumber: true },
  });

  let seq = 1;
  if (latest) {
    const lastSeq = parseInt(
      latest.creditNoteNumber.split("-").pop() || "0",
      10,
    );
    seq = lastSeq + 1;
  }

  return `${pattern}${String(seq).padStart(4, "0")}`;
}

const invoicesRouter = router({
  generate: protectedProcedure
    .use(requirePermission("settings.manage"))
    .input(
      z.object({
        funderId: z.string().min(1),
        periodStart: z.string().min(1),
        periodEnd: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get approved but uninvoiced billable visits for this funder+period
      const visits = await ctx.db.billableVisit.findMany({
        where: {
          status: "APPROVED",
          invoiceLineId: null,
          visitDate: {
            gte: new Date(input.periodStart),
            lte: new Date(input.periodEnd),
          },
          carePackage: { funderId: input.funderId },
        },
        include: {
          serviceUser: {
            select: { id: true, firstName: true, lastName: true },
          },
          carePackage: { select: { id: true, packageName: true } },
        },
      });

      if (visits.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "No approved uninvoiced visits found for this funder and period",
        });
      }

      // Group visits by serviceUser+carePackage
      const groups = new Map<
        string,
        typeof visits
      >();
      for (const v of visits) {
        const key = `${v.serviceUserId}|${v.carePackageId}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(v);
      }

      // Get org for invoice prefix
      const org = await ctx.db.organisation.findFirst({
        where: { id: ctx.user.organisationId },
        select: { invoicePrefix: true },
      });

      const funder = await ctx.db.funder.findFirstOrThrow({
        where: { id: input.funderId },
      });

      const invoiceNumber = await generateInvoiceNumber(
        ctx.db,
        ctx.user.organisationId,
        org?.invoicePrefix ?? null,
      );

      // Calculate totals
      let subtotal = new Decimal(0);
      const lineData: {
        serviceUserId: string;
        carePackageId: string;
        description: string;
        totalVisits: number;
        totalHours: number;
        totalMileage: number;
        careTotal: Decimal;
        mileageTotal: Decimal;
        lineTotal: Decimal;
        visitIds: string[];
      }[] = [];

      for (const [, groupVisits] of groups) {
        const first = groupVisits[0];
        const totalVisits = groupVisits.length;
        const totalMinutes = groupVisits.reduce(
          (s, v) => s + v.billingDurationMinutes,
          0,
        );
        const careTotal = groupVisits.reduce(
          (s, v) => s.add(v.lineTotal),
          new Decimal(0),
        );
        const mileageTotal = groupVisits.reduce(
          (s, v) => s.add(v.mileageTotal || new Decimal(0)),
          new Decimal(0),
        );
        const totalMileage = groupVisits.reduce(
          (s, v) => s + Number(v.mileageMiles || 0),
          0,
        );

        const lt = careTotal.add(mileageTotal);
        subtotal = subtotal.add(lt);

        lineData.push({
          serviceUserId: first.serviceUserId,
          carePackageId: first.carePackageId,
          description: `${first.serviceUser.firstName} ${first.serviceUser.lastName} - ${first.carePackage.packageName}`,
          totalVisits,
          totalHours: Math.round((totalMinutes / 60) * 100) / 100,
          totalMileage: Math.round(totalMileage * 100) / 100,
          careTotal,
          mileageTotal,
          lineTotal: lt,
          visitIds: groupVisits.map((v) => v.id),
        });
      }

      const vatAmount = subtotal
        .mul(new Decimal(0))
        .toDecimalPlaces(2);
      const total = subtotal.add(vatAmount);

      const dueDate = new Date(input.periodEnd);
      dueDate.setDate(dueDate.getDate() + funder.paymentTermsDays);

      // Create invoice + lines in a transaction-like flow
      const invoice = await ctx.db.invoice.create({
        data: {
          organisationId: ctx.user.organisationId,
          invoiceNumber,
          funderId: input.funderId,
          invoiceDate: new Date(),
          dueDate,
          periodStart: new Date(input.periodStart),
          periodEnd: new Date(input.periodEnd),
          subtotal,
          vatRate: new Decimal(0),
          vatAmount,
          total,
          status: "DRAFT",
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        },
      });

      // Create lines and link visits
      for (const line of lineData) {
        const invoiceLine = await ctx.db.invoiceLine.create({
          data: {
            invoiceId: invoice.id,
            serviceUserId: line.serviceUserId,
            carePackageId: line.carePackageId,
            description: line.description,
            totalVisits: line.totalVisits,
            totalHours: line.totalHours,
            totalMileage: line.totalMileage,
            careTotal: line.careTotal,
            mileageTotal: line.mileageTotal,
            lineTotal: line.lineTotal,
          },
        });

        // Link billable visits to this invoice line
        await ctx.db.billableVisit.updateMany({
          where: { id: { in: line.visitIds } },
          data: {
            invoiceLineId: invoiceLine.id,
            status: "INVOICED",
            updatedBy: ctx.user.id,
          },
        });
      }

      return invoice;
    }),

  list: protectedProcedure
    .use(requirePermission("reports.view_all"))
    .input(
      z.object({
        funderId: z.string().optional(),
        status: z.nativeEnum(InvoiceStatus).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;
      const where = {
        ...(input.funderId && { funderId: input.funderId }),
        ...(input.status && { status: input.status }),
      };

      const [items, total] = await Promise.all([
        ctx.db.invoice.findMany({
          where,
          include: {
            funder: { select: { id: true, name: true } },
            _count: { select: { lines: true } },
          },
          orderBy: { invoiceDate: "desc" },
          skip,
          take: input.limit,
        }),
        ctx.db.invoice.count({ where }),
      ]);

      return { items, total, page: input.page, limit: input.limit };
    }),

  getById: protectedProcedure
    .use(requirePermission("reports.view_all"))
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.invoice.findFirstOrThrow({
        where: { id: input.id },
        include: {
          funder: true,
          lines: {
            include: {
              serviceUser: {
                select: { id: true, firstName: true, lastName: true },
              },
              carePackage: { select: { id: true, packageName: true } },
              billableVisits: {
                select: {
                  id: true,
                  visitDate: true,
                  dayType: true,
                  billingDurationMinutes: true,
                  appliedRatePerHour: true,
                  lineTotal: true,
                  mileageTotal: true,
                  visitTotal: true,
                },
                orderBy: { visitDate: "asc" },
              },
            },
          },
          creditNotes: true,
        },
      });
    }),

  send: protectedProcedure
    .use(requirePermission("settings.manage"))
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.invoice.update({
        where: { id: input.id },
        data: {
          status: "SENT",
          sentDate: new Date(),
          updatedBy: ctx.user.id,
        },
      });
    }),

  markPaid: protectedProcedure
    .use(requirePermission("settings.manage"))
    .input(
      z.object({
        id: z.string().min(1),
        paidDate: z.string().min(1),
        paidAmount: z.string().min(1),
        paymentReference: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findFirstOrThrow({
        where: { id: input.id },
      });

      const paidAmount = new Decimal(input.paidAmount);
      const isFullyPaid = paidAmount.gte(invoice.total);

      return ctx.db.invoice.update({
        where: { id: input.id },
        data: {
          status: isFullyPaid ? "PAID" : "PARTIALLY_PAID",
          paidDate: new Date(input.paidDate),
          paidAmount,
          paymentReference: input.paymentReference,
          updatedBy: ctx.user.id,
        },
      });
    }),

  void: protectedProcedure
    .use(requirePermission("settings.manage"))
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Reset billable visits back to APPROVED
      const invoice = await ctx.db.invoice.findFirstOrThrow({
        where: { id: input.id },
        include: { lines: { select: { id: true } } },
      });

      const lineIds = invoice.lines.map((l) => l.id);
      if (lineIds.length > 0) {
        await ctx.db.billableVisit.updateMany({
          where: { invoiceLineId: { in: lineIds } },
          data: {
            invoiceLineId: null,
            status: "APPROVED",
            updatedBy: ctx.user.id,
          },
        });
      }

      return ctx.db.invoice.update({
        where: { id: input.id },
        data: { status: "VOID", updatedBy: ctx.user.id },
      });
    }),

  overdue: protectedProcedure
    .use(requirePermission("reports.view_all"))
    .query(async ({ ctx }) => {
      return ctx.db.invoice.findMany({
        where: {
          status: { in: ["SENT", "PARTIALLY_PAID"] },
          dueDate: { lt: new Date() },
        },
        include: {
          funder: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: "asc" },
      });
    }),
});

// ─────────────────────────────────────────────
// Credit Notes
// ─────────────────────────────────────────────

const creditNotesRouter = router({
  create: protectedProcedure
    .use(requirePermission("settings.manage"))
    .input(
      z.object({
        invoiceId: z.string().min(1),
        amount: z.string().min(1),
        reason: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findFirstOrThrow({
        where: { id: input.invoiceId },
        include: { funder: true },
      });

      const org = await ctx.db.organisation.findFirst({
        where: { id: ctx.user.organisationId },
        select: { invoicePrefix: true },
      });

      const creditNoteNumber = await generateCreditNoteNumber(
        ctx.db,
        ctx.user.organisationId,
        org?.invoicePrefix ?? null,
      );

      return ctx.db.creditNote.create({
        data: {
          organisationId: ctx.user.organisationId,
          creditNoteNumber,
          invoiceId: input.invoiceId,
          funderId: invoice.funderId,
          creditDate: new Date(),
          amount: new Decimal(input.amount),
          reason: input.reason,
          status: "DRAFT",
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        },
      });
    }),

  list: protectedProcedure
    .use(requirePermission("reports.view_all"))
    .input(
      z.object({
        funderId: z.string().optional(),
        status: z.nativeEnum(CreditNoteStatus).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.creditNote.findMany({
        where: {
          ...(input.funderId && { funderId: input.funderId }),
          ...(input.status && { status: input.status }),
        },
        include: {
          invoice: { select: { id: true, invoiceNumber: true } },
          funder: { select: { id: true, name: true } },
        },
        orderBy: { creditDate: "desc" },
      });
    }),

  getById: protectedProcedure
    .use(requirePermission("reports.view_all"))
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.creditNote.findFirstOrThrow({
        where: { id: input.id },
        include: {
          invoice: true,
          funder: true,
        },
      });
    }),

  send: protectedProcedure
    .use(requirePermission("settings.manage"))
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.creditNote.update({
        where: { id: input.id },
        data: { status: "SENT", updatedBy: ctx.user.id },
      });
    }),
});

// ─────────────────────────────────────────────
// Reports
// ─────────────────────────────────────────────

const reportsRouter = router({
  revenueByPeriod: protectedProcedure
    .use(requirePermission("reports.view_all"))
    .input(
      z.object({
        periodStart: z.string().min(1),
        periodEnd: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const invoices = await ctx.db.invoice.findMany({
        where: {
          status: { in: ["SENT", "PAID", "PARTIALLY_PAID"] },
          invoiceDate: {
            gte: new Date(input.periodStart),
            lte: new Date(input.periodEnd),
          },
        },
        select: {
          invoiceDate: true,
          total: true,
          paidAmount: true,
          status: true,
        },
      });

      const totalInvoiced = invoices.reduce(
        (sum, i) => sum.add(i.total),
        new Decimal(0),
      );
      const totalPaid = invoices.reduce(
        (sum, i) => sum.add(i.paidAmount || new Decimal(0)),
        new Decimal(0),
      );
      const totalOutstanding = totalInvoiced.sub(totalPaid);

      return {
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        invoiceCount: invoices.length,
      };
    }),

  revenueByFunder: protectedProcedure
    .use(requirePermission("reports.view_all"))
    .input(
      z.object({
        periodStart: z.string().min(1),
        periodEnd: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const invoices = await ctx.db.invoice.findMany({
        where: {
          status: { not: "VOID" },
          invoiceDate: {
            gte: new Date(input.periodStart),
            lte: new Date(input.periodEnd),
          },
        },
        include: {
          funder: { select: { id: true, name: true, funderType: true } },
        },
      });

      const byFunder = new Map<
        string,
        {
          funderId: string;
          funderName: string;
          funderType: FunderType;
          total: Decimal;
          paid: Decimal;
          count: number;
        }
      >();

      for (const inv of invoices) {
        const existing = byFunder.get(inv.funderId) || {
          funderId: inv.funderId,
          funderName: inv.funder.name,
          funderType: inv.funder.funderType,
          total: new Decimal(0),
          paid: new Decimal(0),
          count: 0,
        };
        existing.total = existing.total.add(inv.total);
        existing.paid = existing.paid.add(inv.paidAmount || new Decimal(0));
        existing.count++;
        byFunder.set(inv.funderId, existing);
      }

      return Array.from(byFunder.values());
    }),

  agedDebt: protectedProcedure
    .use(requirePermission("reports.view_all"))
    .query(async ({ ctx }) => {
      const unpaid = await ctx.db.invoice.findMany({
        where: {
          status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
        },
        include: {
          funder: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: "asc" },
      });

      const now = new Date();
      const buckets = {
        current: new Decimal(0),
        thirtyDays: new Decimal(0),
        sixtyDays: new Decimal(0),
        ninetyPlus: new Decimal(0),
      };

      const items = unpaid.map((inv) => {
        const outstanding = inv.total.sub(
          inv.paidAmount || new Decimal(0),
        );
        const daysOverdue = Math.max(
          0,
          Math.floor(
            (now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );

        if (daysOverdue <= 0) buckets.current = buckets.current.add(outstanding);
        else if (daysOverdue <= 30)
          buckets.thirtyDays = buckets.thirtyDays.add(outstanding);
        else if (daysOverdue <= 60)
          buckets.sixtyDays = buckets.sixtyDays.add(outstanding);
        else buckets.ninetyPlus = buckets.ninetyPlus.add(outstanding);

        return {
          ...inv,
          outstanding,
          daysOverdue,
        };
      });

      return { buckets, items };
    }),
});

// ─────────────────────────────────────────────
// Visit Schedules
// ─────────────────────────────────────────────

const visitSchedulesRouter = router({
  listByPackage: protectedProcedure
    .use(requirePermission("clients.read"))
    .input(z.object({ carePackageId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.visitSchedule.findMany({
        where: { carePackageId: input.carePackageId, isActive: true },
        orderBy: [
          { dayOfWeek: "asc" },
          { startTime: "asc" },
        ],
      });
    }),

  create: protectedProcedure
    .use(requirePermission("clients.update"))
    .input(
      z.object({
        carePackageId: z.string().min(1),
        dayOfWeek: z.nativeEnum(DayOfWeek),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        carersRequired: z.number().int().min(1).default(1),
        effectiveFrom: z.string(),
        effectiveTo: z.string().nullable().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pkg = await ctx.db.carePackage.findFirstOrThrow({
        where: { id: input.carePackageId },
        select: { organisationId: true },
      });
      return ctx.db.visitSchedule.create({
        data: {
          organisationId: pkg.organisationId,
          carePackageId: input.carePackageId,
          dayOfWeek: input.dayOfWeek,
          startTime: input.startTime,
          endTime: input.endTime,
          carersRequired: input.carersRequired,
          effectiveFrom: new Date(input.effectiveFrom),
          effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
          notes: input.notes,
          createdBy: ctx.session.user.id,
          updatedBy: ctx.session.user.id,
        },
      });
    }),

  update: protectedProcedure
    .use(requirePermission("clients.update"))
    .input(
      z.object({
        id: z.string().min(1),
        dayOfWeek: z.nativeEnum(DayOfWeek).optional(),
        startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        carersRequired: z.number().int().min(1).optional(),
        effectiveFrom: z.string().optional(),
        effectiveTo: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, effectiveFrom, effectiveTo, ...rest } = input;
      return ctx.db.visitSchedule.update({
        where: { id },
        data: {
          ...rest,
          ...(effectiveFrom && { effectiveFrom: new Date(effectiveFrom) }),
          ...(effectiveTo !== undefined && {
            effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
          }),
          updatedBy: ctx.session.user.id,
        },
      });
    }),

  delete: protectedProcedure
    .use(requirePermission("clients.update"))
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.visitSchedule.update({
        where: { id: input.id },
        data: { isActive: false, updatedBy: ctx.session.user.id },
      });
    }),
});

// ─────────────────────────────────────────────
// Combined Financial Router
// ─────────────────────────────────────────────

export const financialRouter = router({
  funders: fundersRouter,
  rateCards: rateCardsRouter,
  bankHolidays: bankHolidaysRouter,
  carePackages: carePackagesRouter,
  reconciliation: reconciliationRouter,
  invoices: invoicesRouter,
  creditNotes: creditNotesRouter,
  reports: reportsRouter,
  visitSchedules: visitSchedulesRouter,
});

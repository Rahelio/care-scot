import { z } from "zod";
import {
  ServiceUserStatus,
  IncidentStatus,
  ComplaintStatus,
  AuditAction,
  TrainingType,
} from "@prisma/client";
import { router, protectedProcedure } from "../trpc";
import { requirePermission } from "../middleware/rbac";
import { createAuditLog } from "../middleware/audit";
import { buildCsv } from "@/lib/csv";

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

const reportProcedure = protectedProcedure.use(
  requirePermission("reports.view_all"),
);

function dateStr(d: Date | null | undefined): string {
  return d ? d.toISOString().split("T")[0] : "";
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const reportsRouter = router({
  // ── Service Users ──────────────────────────────────────────────────────────
  exportServiceUsers: reportProcedure
    .input(
      z.object({
        status: z.nativeEnum(ServiceUserStatus).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };

      const items = await ctx.prisma.serviceUser.findMany({
        where: {
          organisationId,
          ...(input.status ? { status: input.status } : {}),
        },
        orderBy: { lastName: "asc" },
        select: {
          lastName: true,
          firstName: true,
          dateOfBirth: true,
          chiNumber: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          postcode: true,
          phonePrimary: true,
          status: true,
          dischargeDate: true,
          dischargeReason: true,
        },
      });

      const headers = [
        "Last Name",
        "First Name",
        "Date of Birth",
        "CHI Number",
        "Address",
        "Postcode",
        "Phone",
        "Status",
        "Discharge Date",
        "Discharge Reason",
      ];
      const rows = items.map((su) => [
        su.lastName,
        su.firstName,
        dateStr(su.dateOfBirth),
        su.chiNumber ?? "",
        [su.addressLine1, su.addressLine2, su.city]
          .filter(Boolean)
          .join(", "),
        su.postcode ?? "",
        su.phonePrimary ?? "",
        su.status,
        dateStr(su.dischargeDate),
        su.dischargeReason ?? "",
      ]);

      await createAuditLog({
        organisationId,
        userId,
        entityType: "ServiceUser",
        entityId: crypto.randomUUID(),
        action: AuditAction.EXPORT,
        changes: { exported: { count: items.length } },
      });

      return {
        csv: buildCsv(headers, rows),
        filename: `service-users-${today()}.csv`,
      };
    }),

  // ── Training Matrix ────────────────────────────────────────────────────────
  exportTrainingMatrix: reportProcedure.query(async ({ ctx }) => {
    const { organisationId, id: userId } = ctx.user as {
      organisationId: string;
      id: string;
    };

    const trainingTypes = Object.values(TrainingType);
    const staff = await ctx.prisma.staffMember.findMany({
      where: { organisationId, status: "ACTIVE" },
      orderBy: { lastName: "asc" },
      select: {
        firstName: true,
        lastName: true,
        trainingRecords: {
          select: {
            trainingType: true,
            completionDate: true,
            expiryDate: true,
            isMandatory: true,
          },
        },
      },
    });

    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const headers = ["Staff Member", ...trainingTypes.map((t) => t.replace(/_/g, " "))];
    const rows = staff.map((s) => {
      const name = `${s.firstName} ${s.lastName}`;
      const cells = trainingTypes.map((tt) => {
        const records = s.trainingRecords.filter((r) => r.trainingType === tt);
        if (records.length === 0) return "Missing";
        // Take the most recent by completion date
        const latest = records.sort(
          (a, b) => b.completionDate.getTime() - a.completionDate.getTime(),
        )[0];
        if (!latest.expiryDate) return "Up to date";
        if (latest.expiryDate < now) return "Expired";
        if (latest.expiryDate <= in90Days) return "Expiring";
        return "Up to date";
      });
      return [name, ...cells];
    });

    await createAuditLog({
      organisationId,
      userId,
      entityType: "StaffTrainingRecord",
      entityId: crypto.randomUUID(),
      action: AuditAction.EXPORT,
      changes: { exported: { staffCount: staff.length } },
    });

    return {
      csv: buildCsv(headers, rows),
      filename: `training-matrix-${today()}.csv`,
    };
  }),

  // ── Incidents ──────────────────────────────────────────────────────────────
  exportIncidents: reportProcedure
    .input(
      z.object({
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        status: z.nativeEnum(IncidentStatus).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };

      const items = await ctx.prisma.incident.findMany({
        where: {
          organisationId,
          ...(input.status ? { status: input.status } : {}),
          ...(input.from || input.to
            ? {
                incidentDate: {
                  ...(input.from ? { gte: input.from } : {}),
                  ...(input.to ? { lte: input.to } : {}),
                },
              }
            : {}),
        },
        orderBy: { incidentDate: "desc" },
        select: {
          incidentDate: true,
          incidentType: true,
          severity: true,
          status: true,
          serviceUser: {
            select: { firstName: true, lastName: true },
          },
          description: true,
          location: true,
          reportedDate: true,
          closedDate: true,
        },
      });

      const headers = [
        "Date",
        "Type",
        "Severity",
        "Status",
        "Service User",
        "Description",
        "Location",
        "Reported Date",
        "Closed Date",
      ];
      const rows = items.map((inc) => [
        dateStr(inc.incidentDate),
        inc.incidentType.replace(/_/g, " "),
        inc.severity,
        inc.status,
        inc.serviceUser
          ? `${inc.serviceUser.firstName} ${inc.serviceUser.lastName}`
          : "",
        (inc.description ?? "").slice(0, 500),
        inc.location ?? "",
        dateStr(inc.reportedDate),
        dateStr(inc.closedDate),
      ]);

      await createAuditLog({
        organisationId,
        userId,
        entityType: "Incident",
        entityId: crypto.randomUUID(),
        action: AuditAction.EXPORT,
        changes: { exported: { count: items.length } },
      });

      return {
        csv: buildCsv(headers, rows),
        filename: `incidents-${today()}.csv`,
      };
    }),

  // ── Complaints ─────────────────────────────────────────────────────────────
  exportComplaints: reportProcedure
    .input(
      z.object({
        status: z.nativeEnum(ComplaintStatus).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };

      const items = await ctx.prisma.complaint.findMany({
        where: {
          organisationId,
          ...(input.status ? { status: input.status } : {}),
        },
        orderBy: { dateReceived: "desc" },
        select: {
          dateReceived: true,
          complainantName: true,
          serviceUser: {
            select: { firstName: true, lastName: true },
          },
          natureOfComplaint: true,
          status: true,
          responseSentDate: true,
        },
      });

      const now = new Date();
      const headers = [
        "Date Received",
        "Complainant",
        "Service User",
        "Nature",
        "Status",
        "Response Sent",
        "SLA Deadline",
        "Overdue",
      ];
      const rows = items.map((c) => {
        const slaDeadline = addWorkingDays(new Date(c.dateReceived), 20);
        const isOverdue =
          c.status !== "RESOLVED" && !c.responseSentDate && now > slaDeadline;
        return [
          dateStr(c.dateReceived),
          c.complainantName ?? "",
          c.serviceUser
            ? `${c.serviceUser.firstName} ${c.serviceUser.lastName}`
            : "",
          (c.natureOfComplaint ?? "").slice(0, 500),
          c.status,
          dateStr(c.responseSentDate),
          dateStr(slaDeadline),
          isOverdue ? "Yes" : "No",
        ];
      });

      await createAuditLog({
        organisationId,
        userId,
        entityType: "Complaint",
        entityId: crypto.randomUUID(),
        action: AuditAction.EXPORT,
        changes: { exported: { count: items.length } },
      });

      return {
        csv: buildCsv(headers, rows),
        filename: `complaints-${today()}.csv`,
      };
    }),

  // ── Audit Log ──────────────────────────────────────────────────────────────
  exportAuditLog: reportProcedure
    .input(
      z.object({
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
        entityType: z.string().optional(),
        action: z.nativeEnum(AuditAction).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };

      const items = await ctx.prisma.auditLog.findMany({
        where: {
          organisationId,
          ...(input.action ? { action: input.action } : {}),
          ...(input.entityType ? { entityType: input.entityType } : {}),
          ...(input.dateFrom || input.dateTo
            ? {
                createdAt: {
                  ...(input.dateFrom ? { gte: input.dateFrom } : {}),
                  ...(input.dateTo ? { lte: input.dateTo } : {}),
                },
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 5000,
        select: {
          createdAt: true,
          user: { select: { email: true } },
          entityType: true,
          entityId: true,
          action: true,
          changes: true,
        },
      });

      const headers = [
        "Timestamp",
        "User",
        "Entity Type",
        "Entity ID",
        "Action",
        "Changes",
      ];
      const rows = items.map((log) => [
        log.createdAt.toISOString(),
        log.user?.email ?? "",
        log.entityType,
        log.entityId,
        log.action,
        log.changes ? JSON.stringify(log.changes).slice(0, 500) : "",
      ]);

      await createAuditLog({
        organisationId,
        userId,
        entityType: "AuditLog",
        entityId: crypto.randomUUID(),
        action: AuditAction.EXPORT,
        changes: { exported: { count: items.length } },
      });

      return {
        csv: buildCsv(headers, rows),
        filename: `audit-log-${today()}.csv`,
      };
    }),
});

import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";

// ─── Deduplication ────────────────────────────────────────────────────────────

async function isDuplicate(opts: {
  organisationId: string;
  userId: string;
  title: string;
  entityType: string;
  entityId: string;
}): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await prisma.notification.findFirst({
    where: {
      organisationId: opts.organisationId,
      userId: opts.userId,
      title: opts.title,
      entityType: opts.entityType,
      entityId: opts.entityId,
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  return existing !== null;
}

// ─── Shared: notify all MANAGER+ users with dedup ────────────────────────────

export async function notifyManagers(
  db: PrismaClient,
  opts: {
    organisationId: string;
    title: string;
    message: string;
    entityType: string;
    entityId: string;
    link: string;
  },
) {
  const managers = await db.user.findMany({
    where: {
      organisationId: opts.organisationId,
      role: { in: ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"] },
      isActive: true,
    },
    select: { id: true },
  });

  const notifications: Array<{
    organisationId: string;
    userId: string;
    title: string;
    message: string;
    entityType: string;
    entityId: string;
    link: string;
  }> = [];

  for (const mgr of managers) {
    const dup = await isDuplicate({
      organisationId: opts.organisationId,
      userId: mgr.id,
      title: opts.title,
      entityType: opts.entityType,
      entityId: opts.entityId,
    });
    if (!dup) {
      notifications.push({
        organisationId: opts.organisationId,
        userId: mgr.id,
        title: opts.title,
        message: opts.message,
        entityType: opts.entityType,
        entityId: opts.entityId,
        link: opts.link,
      });
    }
  }

  if (notifications.length > 0) {
    await db.notification.createMany({ data: notifications });
  }

  return notifications.length;
}

// ─── Check functions ─────────────────────────────────────────────────────────

export async function checkExpiringPVG(organisationId: string) {
  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const records = await prisma.staffPvgRecord.findMany({
    where: {
      staffMember: { organisationId, status: "ACTIVE" },
      renewalDate: { gte: now, lte: in90Days },
    },
    select: {
      id: true,
      staffMemberId: true,
      renewalDate: true,
      staffMember: { select: { firstName: true, lastName: true } },
    },
  });

  let created = 0;
  for (const rec of records) {
    created += await notifyManagers(prisma, {
      organisationId,
      title: `PVG Renewal Due — ${rec.staffMember.firstName} ${rec.staffMember.lastName}`,
      message: `PVG renewal is due on ${rec.renewalDate?.toISOString().split("T")[0]}.`,
      entityType: "staff_member",
      entityId: rec.staffMemberId,
      link: `/staff/${rec.staffMemberId}`,
    });
  }
  return created;
}

export async function checkExpiringSSSC(organisationId: string) {
  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const records = await prisma.staffRegistration.findMany({
    where: {
      staffMember: { organisationId, status: "ACTIVE" },
      registrationType: "SSSC",
      expiryDate: { gte: now, lte: in90Days },
    },
    select: {
      id: true,
      staffMemberId: true,
      expiryDate: true,
      staffMember: { select: { firstName: true, lastName: true } },
    },
  });

  let created = 0;
  for (const rec of records) {
    created += await notifyManagers(prisma, {
      organisationId,
      title: `SSSC Registration Expiring — ${rec.staffMember.firstName} ${rec.staffMember.lastName}`,
      message: `SSSC registration expires on ${rec.expiryDate?.toISOString().split("T")[0]}.`,
      entityType: "staff_member",
      entityId: rec.staffMemberId,
      link: `/staff/${rec.staffMemberId}`,
    });
  }
  return created;
}

export async function checkExpiringTraining(organisationId: string) {
  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const records = await prisma.staffTrainingRecord.findMany({
    where: {
      staffMember: { organisationId, status: "ACTIVE" },
      isMandatory: true,
      expiryDate: { gte: now, lte: in90Days },
    },
    select: {
      id: true,
      staffMemberId: true,
      trainingType: true,
      expiryDate: true,
      staffMember: { select: { firstName: true, lastName: true } },
    },
  });

  let created = 0;
  for (const rec of records) {
    created += await notifyManagers(prisma, {
      organisationId,
      title: `Training Expiring — ${rec.trainingType} (${rec.staffMember.firstName} ${rec.staffMember.lastName})`,
      message: `Mandatory training expires on ${rec.expiryDate?.toISOString().split("T")[0]}.`,
      entityType: "staff_member",
      entityId: rec.staffMemberId,
      link: `/staff/${rec.staffMemberId}`,
    });
  }
  return created;
}

export async function checkOverduePersonalPlans(organisationId: string) {
  const now = new Date();
  const threshold = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  const plans = await prisma.personalPlan.findMany({
    where: {
      serviceUser: { organisationId },
      status: "ACTIVE",
      nextReviewDate: { lt: threshold },
    },
    select: {
      id: true,
      serviceUserId: true,
      serviceUser: { select: { firstName: true, lastName: true } },
    },
  });

  let created = 0;
  for (const plan of plans) {
    created += await notifyManagers(prisma, {
      organisationId,
      title: `Personal Plan Overdue — ${plan.serviceUser.firstName} ${plan.serviceUser.lastName}`,
      message: `Personal plan review is overdue by more than 28 days.`,
      entityType: "personal_plan",
      entityId: plan.id,
      link: `/clients/${plan.serviceUserId}`,
    });
  }
  return created;
}

export async function checkOverdueReviews(organisationId: string) {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  // Find service users whose most recent review is >12 months ago
  const serviceUsers = await prisma.serviceUser.findMany({
    where: { organisationId, status: "ACTIVE" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      serviceUserReviews: {
        orderBy: { reviewDate: "desc" },
        take: 1,
        select: { reviewDate: true },
      },
    },
  });

  let created = 0;
  for (const su of serviceUsers) {
    const lastReview = su.serviceUserReviews[0];
    if (!lastReview || lastReview.reviewDate < twelveMonthsAgo) {
      created += await notifyManagers(prisma, {
        organisationId,
        title: `Annual Review Overdue — ${su.firstName} ${su.lastName}`,
        message: lastReview
          ? `Last review was on ${lastReview.reviewDate.toISOString().split("T")[0]}.`
          : `No review has been recorded.`,
        entityType: "service_user",
        entityId: su.id,
        link: `/clients/${su.id}`,
      });
    }
  }
  return created;
}

export async function checkOverduePolicies(organisationId: string) {
  const now = new Date();

  const policies = await prisma.policy.findMany({
    where: {
      organisationId,
      status: "ACTIVE",
      nextReviewDate: { lt: now },
    },
    select: {
      id: true,
      policyName: true,
    },
  });

  let created = 0;
  for (const policy of policies) {
    created += await notifyManagers(prisma, {
      organisationId,
      title: `Policy Overdue — ${policy.policyName}`,
      message: `Policy "${policy.policyName}" is overdue for review.`,
      entityType: "policy",
      entityId: policy.id,
      link: `/compliance?tab=policies`,
    });
  }
  return created;
}

export async function checkOverdueEquipment(organisationId: string) {
  const now = new Date();

  const checks = await prisma.equipmentCheck.findMany({
    where: {
      organisationId,
      nextCheckDate: { lt: now },
    },
    select: {
      id: true,
      equipmentName: true,
      serialNumber: true,
      nextCheckDate: true,
    },
  });

  let created = 0;
  for (const check of checks) {
    created += await notifyManagers(prisma, {
      organisationId,
      title: `Equipment Check Overdue — ${check.equipmentName}`,
      message: `Equipment check for "${check.equipmentName}"${check.serialNumber ? ` (S/N: ${check.serialNumber})` : ""} is overdue.`,
      entityType: "equipment_check",
      entityId: check.id,
      link: `/incidents?tab=equipment`,
    });
  }
  return created;
}

export async function checkOpenIncidents(organisationId: string) {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const incidents = await prisma.incident.findMany({
    where: {
      organisationId,
      status: { not: "CLOSED" },
      incidentDate: { lt: fourteenDaysAgo },
    },
    select: {
      id: true,
      incidentType: true,
      incidentDate: true,
    },
  });

  let created = 0;
  for (const inc of incidents) {
    created += await notifyManagers(prisma, {
      organisationId,
      title: `Incident Open >14 Days — ${inc.incidentType}`,
      message: `Incident from ${inc.incidentDate.toISOString().split("T")[0]} has been open for more than 14 days.`,
      entityType: "incident",
      entityId: inc.id,
      link: `/incidents/${inc.id}`,
    });
  }
  return created;
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export async function runAllChecks(organisationId: string) {
  const checks = [
    { name: "checkExpiringPVG", fn: checkExpiringPVG },
    { name: "checkExpiringSSSC", fn: checkExpiringSSSC },
    { name: "checkExpiringTraining", fn: checkExpiringTraining },
    { name: "checkOverduePersonalPlans", fn: checkOverduePersonalPlans },
    { name: "checkOverdueReviews", fn: checkOverdueReviews },
    { name: "checkOverduePolicies", fn: checkOverduePolicies },
    { name: "checkOverdueEquipment", fn: checkOverdueEquipment },
    { name: "checkOpenIncidents", fn: checkOpenIncidents },
  ];

  const results = await Promise.allSettled(
    checks.map(async ({ name, fn }) => {
      const count = await fn(organisationId);
      return { name, count };
    }),
  );

  const summary: Record<string, number | string> = {};
  for (const result of results) {
    if (result.status === "fulfilled") {
      summary[result.value.name] = result.value.count;
    } else {
      const reason =
        result.reason instanceof Error ? result.reason.message : String(result.reason);
      console.error(`[notification-generator] ${reason}`);
      summary["error"] = reason;
    }
  }

  return summary;
}

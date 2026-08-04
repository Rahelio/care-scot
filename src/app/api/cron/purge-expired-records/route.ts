import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { purgeExpiredRecords } from "@/server/services/shared/data-retention";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Anonymises ServiceUser/StaffMember records past the org's data-retention
 * period (see data-retention.ts). Does nothing on its own — needs scheduling
 * the same way /api/cron/check-compliance does (CI-CD Pipeline Manual.md).
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgs = await prisma.organisation.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const results = await Promise.allSettled(
    orgs.map(async (org) => {
      const summary = await purgeExpiredRecords(prisma, org.id);
      return { orgId: org.id, orgName: org.name, ...summary };
    }),
  );

  const output = results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      orgId: orgs[i].id,
      orgName: orgs[i].name,
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });

  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({
    checked: orgs.length,
    failed,
    results: output,
  });
}

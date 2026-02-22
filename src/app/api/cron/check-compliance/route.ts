import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAllChecks } from "@/server/services/shared/notification-generator";

const CRON_SECRET = process.env.CRON_SECRET;

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
      const summary = await runAllChecks(org.id);
      return { orgId: org.id, orgName: org.name, summary };
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

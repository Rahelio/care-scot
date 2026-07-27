import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CRON_SECRET = process.env.CRON_SECRET;
const ABANDONED_SIGNUP_TTL_MS = 24 * 60 * 60 * 1000; // matches VerificationToken TTL

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - ABANDONED_SIGNUP_TTL_MS);

  // Only orgs that never completed email verification — never touches an
  // org that was deliberately deactivated after having been active.
  const abandoned = await prisma.organisation.findMany({
    where: { isActive: false, createdAt: { lt: cutoff } },
    select: { id: true, users: { select: { email: true } } },
  });

  let deleted = 0;
  for (const org of abandoned) {
    const emails = org.users.map((u) => u.email);
    await prisma.$transaction([
      prisma.verificationToken.deleteMany({ where: { identifier: { in: emails } } }),
      prisma.user.deleteMany({ where: { organisationId: org.id } }),
      prisma.organisation.delete({ where: { id: org.id } }),
    ]);
    deleted++;
  }

  return NextResponse.json({ checked: abandoned.length, deleted });
}

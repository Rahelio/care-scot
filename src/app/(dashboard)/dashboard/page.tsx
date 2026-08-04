import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ReadinessWidgetWrapper } from "./readiness-widget-wrapper";
import { PendingActionsWidget } from "./pending-actions-widget";
import { DashboardModuleCards } from "./dashboard-module-cards";

export const metadata: Metadata = { title: "Dashboard — CareScot" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const org = await prisma.organisation.findUnique({
    where: { id: session.user.organisationId },
    select: { name: true },
  });

  const displayName =
    session.user.email.split("@")[0].replace(/[._-]/g, " ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight capitalize">
          Welcome back, {displayName}
        </h1>
        <p className="text-muted-foreground mt-1">
          {org?.name ?? "Your organisation"} — CareScot Management System
        </p>
      </div>

      <PendingActionsWidget />

      <ReadinessWidgetWrapper role={session.user.role} />

      <DashboardModuleCards />
    </div>
  );
}

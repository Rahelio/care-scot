import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  Users,
  UserCog,
  Pill,
  AlertTriangle,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReadinessWidgetWrapper } from "./readiness-widget-wrapper";

export const metadata: Metadata = { title: "Dashboard — CareScot" };

const MODULE_CARDS = [
  {
    title: "Clients",
    description: "Service user records, care plans, and visit logs",
    icon: Users,
    href: "/clients",
  },
  {
    title: "Staff",
    description: "Staff records, training, supervisions, and appraisals",
    icon: UserCog,
    href: "/staff",
  },
  {
    title: "Medication",
    description: "Medication administration records and audits",
    icon: Pill,
    href: "/medication",
  },
  {
    title: "Incidents",
    description: "Incident reports, safeguarding concerns, and notifications",
    icon: AlertTriangle,
    href: "/incidents",
  },
  {
    title: "Compliance",
    description: "Policies, quality audits, complaints, and inspections",
    icon: ShieldCheck,
    href: "/compliance",
  },
  {
    title: "Rota",
    description: "Shift scheduling and staff availability management",
    icon: Calendar,
    href: "/rota",
  },
];

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

      <ReadinessWidgetWrapper role={session.user.role} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULE_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.href}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Coming soon
                  </Badge>
                </div>
                <CardTitle className="text-base mt-3">{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

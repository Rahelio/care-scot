"use client";

import Link from "next/link";
import type { inferRouterOutputs } from "@trpc/server";
import {
  Users,
  UserCog,
  Pill,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "@/server/root";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "good" | "warn";
type Summary = inferRouterOutputs<AppRouter>["dashboard"]["getModuleSummary"];

interface Stat {
  text: string;
  tone: Tone;
}

interface ModuleCardConfig {
  title: string;
  description: string;
  icon: typeof Users;
  href: string;
  stat: (data: Summary) => Stat | null; // null = caller's role can't see this module's data
}

const MODULE_CARDS: ModuleCardConfig[] = [
  {
    title: "Clients",
    description: "Service user records, care plans, and visit logs",
    icon: Users,
    href: "/clients",
    stat: (d) => {
      const n = d.clients.activeCount;
      if (n === null) return null;
      return { text: `${n} active ${n === 1 ? "client" : "clients"}`, tone: "neutral" };
    },
  },
  {
    title: "Staff",
    description: "Staff records, training, supervisions, and appraisals",
    icon: UserCog,
    href: "/staff",
    stat: (d) => {
      if (d.staff.activeCount === null) return null;
      const expiring = d.staff.expiringCertsCount ?? 0;
      if (expiring > 0) {
        return {
          text: `${expiring} ${expiring === 1 ? "certification" : "certifications"} expiring soon`,
          tone: "warn",
        };
      }
      return { text: `${d.staff.activeCount} active ${d.staff.activeCount === 1 ? "staff member" : "staff"}`, tone: "neutral" };
    },
  },
  {
    title: "Medication",
    description: "Medication administration records and audits",
    icon: Pill,
    href: "/medication",
    stat: (d) => {
      const n = d.medication.openErrorsCount;
      if (n === null) return null;
      if (n === 0) return { text: "No open errors", tone: "good" };
      return { text: `${n} ${n === 1 ? "error" : "errors"} awaiting review`, tone: "warn" };
    },
  },
  {
    title: "Incidents",
    description: "Incident reports, safeguarding concerns, and notifications",
    icon: AlertTriangle,
    href: "/incidents",
    stat: (d) => {
      const n = d.incidents.openCount;
      if (n === null) return null;
      if (n === 0) return { text: "No open incidents", tone: "good" };
      return { text: `${n} open ${n === 1 ? "incident" : "incidents"}`, tone: "warn" };
    },
  },
  {
    title: "Compliance",
    description: "Policies, quality audits, complaints, and inspections",
    icon: ShieldCheck,
    href: "/compliance",
    stat: (d) => {
      const n = d.compliance.overduePolicyReviewsCount;
      if (n === null) return null;
      if (n === 0) return { text: "Policies up to date", tone: "good" };
      return { text: `${n} ${n === 1 ? "policy" : "policies"} overdue for review`, tone: "warn" };
    },
  },
  {
    title: "Rota",
    description: "Shift scheduling and staff availability management",
    icon: Calendar,
    href: "/rota",
    stat: (d) => {
      const n = d.rota.unassignedTodayCount;
      if (n === null) return null;
      if (n === 0) return { text: "Fully staffed today", tone: "good" };
      return { text: `${n} ${n === 1 ? "visit" : "visits"} unassigned today`, tone: "warn" };
    },
  },
];

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "text-foreground",
  good: "text-green-700",
  warn: "text-amber-700",
};

export function DashboardModuleCards() {
  const { data, isPending } = trpc.dashboard.getModuleSummary.useQuery();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {MODULE_CARDS.map((card) => {
        const Icon = card.icon;
        const stat = !isPending && data ? card.stat(data) : null;

        return (
          <Link key={card.href} href={card.href} className="block">
            <Card className="h-full hover:shadow-md hover:border-primary/30 transition-shadow cursor-pointer">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-2" />
                </div>
                <CardTitle className="text-base mt-3">{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
                <div className="pt-1 min-h-[1.25rem]">
                  {stat && (
                    <p className={cn("text-sm font-medium", TONE_CLASSES[stat.tone])}>
                      {stat.text}
                    </p>
                  )}
                </div>
              </CardHeader>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

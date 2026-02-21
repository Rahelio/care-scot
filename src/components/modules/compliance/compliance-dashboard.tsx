"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Shield,
  GraduationCap,
  Users,
  TriangleAlert,
  MessageSquareWarning,
  FileText,
  ClipboardCheck,
  Wrench,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

// ── Circular Score ──────────────────────────────────────────────────────────

function CircularScore({ score }: { score: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80
      ? "text-green-500 stroke-green-500"
      : score >= 60
        ? "text-amber-500 stroke-amber-500"
        : "text-red-500 stroke-red-500";
  const bgRing = "stroke-muted";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="180" height="180" className="-rotate-90">
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          className={bgRing}
          strokeWidth="10"
        />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          className={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold ${color.split(" ")[0]}`}>
          {score}%
        </span>
        <span className="text-xs text-muted-foreground mt-0.5">
          Inspection Ready
        </span>
      </div>
    </div>
  );
}

// ── Score Bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-green-500"
      : score >= 60
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm font-medium w-10 text-right">{score}%</span>
    </div>
  );
}

// ── Category Card ───────────────────────────────────────────────────────────

interface CategoryCardProps {
  title: string;
  icon: React.ReactNode;
  score: number;
  metric: string;
  issues: { label: string; count: number; href?: string; severity?: "warn" | "danger" }[];
}

function CategoryCard({ title, icon, score, metric, issues }: CategoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const issueCount = issues.reduce((sum, i) => sum + i.count, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          {issueCount > 0 && (
            <Badge
              variant="outline"
              className="bg-red-50 text-red-700 border-red-200 text-xs"
            >
              {issueCount} issue{issueCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScoreBar score={score} />
        <p className="text-xs text-muted-foreground">{metric}</p>
        {issues.length > 0 && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              {expanded ? "Hide details" : "Show details"}
            </button>
            {expanded && (
              <ul className="mt-2 space-y-1.5">
                {issues.map((issue) =>
                  issue.count > 0 ? (
                    <li
                      key={issue.label}
                      className="flex items-center justify-between text-xs"
                    >
                      <span
                        className={
                          issue.severity === "danger"
                            ? "text-red-700"
                            : issue.severity === "warn"
                              ? "text-amber-700"
                              : ""
                        }
                      >
                        {issue.label}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{issue.count}</span>
                        {issue.href && (
                          <Link href={issue.href}>
                            <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          </Link>
                        )}
                      </div>
                    </li>
                  ) : null
                )}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────

export function ComplianceDashboard() {
  const { data: overview, isPending: overviewPending } =
    trpc.compliance.dashboard.getOverview.useQuery();
  const { data: readiness, isPending: readinessPending } =
    trpc.compliance.dashboard.getInspectionReadinessScore.useQuery();

  if (overviewPending || readinessPending) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Calculating inspection readiness…
      </div>
    );
  }

  if (!overview || !readiness) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Unable to load dashboard data.
      </div>
    );
  }

  const o = overview;
  const c = readiness.categories;

  const categories: CategoryCardProps[] = [
    {
      title: "Personal Plans",
      icon: <ClipboardList className="h-4 w-4 text-blue-600" />,
      score: c.personalPlans,
      metric: `${o.personalPlans.withPlan} of ${o.personalPlans.total} service users have an active plan`,
      issues: [
        {
          label: "Without a personal plan",
          count: o.personalPlans.withoutPlan,
          severity: "danger",
          href: "/clients",
        },
        {
          label: "Overdue for review (>28 days)",
          count: o.personalPlans.overdue,
          severity: "danger",
          href: "/clients",
        },
        {
          label: "Due for review",
          count: o.personalPlans.dueForReview,
          severity: "warn",
          href: "/clients",
        },
      ],
    },
    {
      title: "Staff Registrations & PVG",
      icon: <Shield className="h-4 w-4 text-indigo-600" />,
      score: c.staffCompliance,
      metric: `${o.staffCompliance.totalStaff} active staff members`,
      issues: [
        {
          label: "PVG expiring within 90 days",
          count: o.staffCompliance.pvgExpiring,
          severity: "warn",
          href: "/staff",
        },
        {
          label: "SSSC expiring within 90 days",
          count: o.staffCompliance.ssscExpiring,
          severity: "warn",
          href: "/staff",
        },
      ],
    },
    {
      title: "Mandatory Training",
      icon: <GraduationCap className="h-4 w-4 text-purple-600" />,
      score: c.staffCompliance,
      metric: `${o.staffCompliance.missingMandatory} staff missing mandatory training`,
      issues: [
        {
          label: "Missing mandatory training",
          count: o.staffCompliance.missingMandatory,
          severity: "danger",
          href: "/staff",
        },
        {
          label: "Training expiring within 90 days",
          count: o.staffCompliance.expiringTraining,
          severity: "warn",
          href: "/staff",
        },
      ],
    },
    {
      title: "Supervision & Appraisals",
      icon: <Users className="h-4 w-4 text-teal-600" />,
      score: c.staffCompliance,
      metric: `${o.staffCompliance.overdueSupervisions} overdue supervisions, ${o.staffCompliance.overdueAppraisals} overdue appraisals`,
      issues: [
        {
          label: "Overdue supervisions (>3 months)",
          count: o.staffCompliance.overdueSupervisions,
          severity: "danger",
          href: "/staff",
        },
        {
          label: "Overdue appraisals (>12 months)",
          count: o.staffCompliance.overdueAppraisals,
          severity: "danger",
          href: "/staff",
        },
      ],
    },
    {
      title: "Incidents",
      icon: <TriangleAlert className="h-4 w-4 text-orange-600" />,
      score: c.incidents,
      metric: `${o.incidents.openCount} open incident${o.incidents.openCount !== 1 ? "s" : ""}`,
      issues: [
        {
          label: "High/Critical open",
          count: o.incidents.highCriticalOpen,
          severity: "danger",
          href: "/incidents",
        },
        {
          label: "Pending CI notifications",
          count: o.incidents.pendingCINotifications,
          severity: "warn",
          href: "/incidents?tab=ci-notifications",
        },
        {
          label: "Open safeguarding concerns",
          count: o.incidents.openSafeguarding,
          severity: "danger",
          href: "/incidents?tab=safeguarding",
        },
      ],
    },
    {
      title: "Complaints",
      icon: <MessageSquareWarning className="h-4 w-4 text-red-600" />,
      score: c.complaints,
      metric: `${o.complaints.openCount} open complaint${o.complaints.openCount !== 1 ? "s" : ""}`,
      issues: [
        {
          label: "Overdue responses (>20 working days)",
          count: o.complaints.overdueResponses,
          severity: "danger",
          href: "/compliance?tab=complaints",
        },
      ],
    },
    {
      title: "Policies",
      icon: <FileText className="h-4 w-4 text-sky-600" />,
      score: c.policies,
      metric: `${o.policies.totalActivePolicies} active polic${o.policies.totalActivePolicies !== 1 ? "ies" : "y"}`,
      issues: [
        {
          label: "Overdue for review",
          count: o.policies.overdueReviews,
          severity: "danger",
          href: "/compliance?tab=policies",
        },
        {
          label: "Pending acknowledgments",
          count: o.policies.pendingAcknowledgments,
          severity: "warn",
          href: "/compliance?tab=policies",
        },
      ],
    },
    {
      title: "Quality Audits",
      icon: <ClipboardCheck className="h-4 w-4 text-emerald-600" />,
      score: c.audits,
      metric: `${o.audits.openCount} open audit${o.audits.openCount !== 1 ? "s" : ""}`,
      issues: [
        {
          label: "Open action items",
          count: o.audits.openActionItems,
          severity: "warn",
          href: "/compliance?tab=audits",
        },
      ],
    },
    {
      title: "Equipment",
      icon: <Wrench className="h-4 w-4 text-gray-600" />,
      score: c.equipment,
      metric: `${o.equipment.overdueChecks} overdue check${o.equipment.overdueChecks !== 1 ? "s" : ""}`,
      issues: [
        {
          label: "Overdue equipment checks",
          count: o.equipment.overdueChecks,
          severity: "danger",
          href: "/incidents?tab=equipment",
        },
      ],
    },
    {
      title: "Service User Reviews",
      icon: <CalendarCheck className="h-4 w-4 text-pink-600" />,
      score: c.reviews,
      metric: `${o.reviews.totalServiceUsers - o.reviews.overdueAnnualReviews} of ${o.reviews.totalServiceUsers} reviewed in last 12 months`,
      issues: [
        {
          label: "Overdue annual reviews (>12 months)",
          count: o.reviews.overdueAnnualReviews,
          severity: "danger",
          href: "/clients",
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Readiness score */}
      <div className="flex flex-col items-center gap-2">
        <CircularScore score={readiness.overall} />
        <p className="text-sm text-muted-foreground max-w-md text-center">
          Weighted score across all compliance areas. Green ({"\u2265"}80%) indicates
          strong readiness for Care Inspectorate inspection.
        </p>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <CategoryCard key={cat.title} {...cat} />
        ))}
      </div>
    </div>
  );
}

// ── Small score widget for main dashboard ───────────────────────────────────

export function InspectionReadinessWidget() {
  const { data: readiness } =
    trpc.compliance.dashboard.getInspectionReadinessScore.useQuery();

  if (!readiness) return null;

  const score = readiness.overall;
  const color =
    score >= 80
      ? "text-green-600"
      : score >= 60
        ? "text-amber-600"
        : "text-red-600";
  const bgColor =
    score >= 80
      ? "bg-green-50 border-green-200"
      : score >= 60
        ? "bg-amber-50 border-amber-200"
        : "bg-red-50 border-red-200";

  return (
    <Link href="/compliance" className="block">
      <Card
        className={`border ${bgColor} hover:shadow-md transition-shadow cursor-pointer`}
      >
        <CardContent className="pt-4 pb-3 flex items-center gap-4">
          <div className="relative">
            <svg width="56" height="56" className="-rotate-90">
              <circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                className="stroke-muted"
                strokeWidth="4"
              />
              <circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                className={
                  score >= 80
                    ? "stroke-green-500"
                    : score >= 60
                      ? "stroke-amber-500"
                      : "stroke-red-500"
                }
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 22}
                strokeDashoffset={
                  2 * Math.PI * 22 - (score / 100) * 2 * Math.PI * 22
                }
              />
            </svg>
            <span
              className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${color}`}
            >
              {score}%
            </span>
          </div>
          <div>
            <p className="text-sm font-medium">Inspection Readiness</p>
            <p className="text-xs text-muted-foreground">
              {score >= 80
                ? "Strong — ready for inspection"
                : score >= 60
                  ? "Fair — some areas need attention"
                  : "Action needed — multiple issues"}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

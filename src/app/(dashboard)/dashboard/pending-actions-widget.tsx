"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";

export function PendingActionsWidget() {
  const { data, isPending } = trpc.clients.getPendingActions.useQuery();

  if (isPending || !data) return null;

  const chips = [
    { label: "plan", plural: "plans", suffix: "pending approval", count: data.plansAwaitingApproval.length },
    { label: "review", plural: "reviews", suffix: "overdue", count: data.overdueReviews.length },
    { label: "risk assessment", plural: "risk assessments", suffix: "overdue", count: data.overdueRiskAssessments.length },
    { label: "agreement", plural: "agreements", suffix: "expiring soon", count: data.expiringSoon.length },
    { label: "consent record", plural: "consent records", suffix: "12m+ old", count: data.expiredConsents.length },
    { label: "client", plural: "clients", suffix: "missing required consent", count: data.missingConsents.length },
  ].filter((c) => c.count > 0);

  if (chips.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-amber-900">Pending Actions</p>
        </div>
        <Link href="/tasks" className="text-xs text-amber-700 hover:underline whitespace-nowrap">
          View all →
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map(({ label, plural, suffix, count }) => (
          <Link key={label} href="/tasks">
            <Badge
              variant="outline"
              className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 cursor-pointer text-xs transition-colors"
            >
              {count} {count === 1 ? label : plural} {suffix}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}

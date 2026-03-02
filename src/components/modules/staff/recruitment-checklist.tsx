"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function getCheckHref(label: string, staffId: string): string {
  const base = `/staff/${staffId}`;
  if (label.startsWith("Mandatory training")) return `${base}/training`;
  if (label.includes("Personal details")) return `${base}/edit`;
  if (label.includes("Right to work")) return `${base}/edit`;
  if (label.includes("PVG")) return `${base}/pvg`;
  if (label.includes("SSSC") || label.includes("registration")) return `${base}/pvg`;
  if (label.includes("references")) return `${base}/pvg`;
  if (label.includes("Health declaration")) return `${base}/health`;
  if (label.includes("Induction")) return `${base}/induction`;
  return base;
}

interface RecruitmentChecklistProps {
  staffId: string;
}

export function RecruitmentChecklist({ staffId }: RecruitmentChecklistProps) {
  const { data, isPending } = trpc.staff.getRecruitmentStatus.useQuery({ id: staffId });

  if (isPending) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Loading…
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { percentage, checks } = data;

  const colour =
    percentage >= 80
      ? "bg-green-500"
      : percentage >= 50
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Recruitment Checklist</CardTitle>
          <span
            className={cn(
              "text-sm font-semibold",
              percentage >= 80
                ? "text-green-700"
                : percentage >= 50
                  ? "text-amber-700"
                  : "text-red-700"
            )}
          >
            {percentage}%
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", colour)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {checks.map((check) => (
          <Link
            key={check.label}
            href={getCheckHref(check.label, staffId)}
            className="flex items-center gap-2.5 text-sm rounded-md px-2 -mx-2 py-1 hover:bg-muted/60 transition-colors"
          >
            {check.complete ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span
              className={cn(
                check.complete ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {check.label}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {check.weight}%
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

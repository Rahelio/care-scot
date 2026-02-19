"use client";

import { use } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";
import { InvestigationForm } from "@/components/modules/medication/investigation-form";
import {
  NCC_MERP_CATEGORIES,
  ERROR_TYPES,
} from "@/components/modules/medication/error-report-form";
import { useSession } from "next-auth/react";

function getMerpBadgeClass(category: string | null): string {
  if (!category) return "bg-muted text-muted-foreground";
  if (["E", "F", "G", "H", "I"].includes(category))
    return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300";
  if (category === "D")
    return "bg-amber-100 text-amber-800 border-amber-200";
  if (["B", "C"].includes(category))
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-muted text-muted-foreground";
}

function LabelValue({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}

export default function MedicationErrorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? "";

  const canInvestigate = ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"].includes(
    userRole
  );

  const { data: error, isPending } = trpc.medication.errors.getById.useQuery(
    { id },
    { enabled: !!id }
  );

  if (isPending) {
    return (
      <div className="py-12 text-center text-muted-foreground">Loading…</div>
    );
  }

  if (!error) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Error report not found.
      </div>
    );
  }

  const categoryMeta = NCC_MERP_CATEGORIES.find(
    (c) => c.value === error.nccMerpCategory
  );
  const isHighSeverity = categoryMeta?.highSeverity ?? false;
  const errorTypeLabel =
    ERROR_TYPES.find((t) => t.value === error.errorType)?.label ??
    error.errorType;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/medication/errors">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Medication Error Log
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold">{errorTypeLabel}</h1>
            {error.nccMerpCategory && (
              <Badge
                variant="outline"
                className={`text-sm font-semibold ${getMerpBadgeClass(error.nccMerpCategory)}`}
              >
                {isHighSeverity && (
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                )}
                NCC MERP Cat. {error.nccMerpCategory}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(error.errorDate)}
            </span>
            {error.serviceUser && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {error.serviceUser.firstName} {error.serviceUser.lastName}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {error.investigatedBy ? (
            <Badge
              variant="secondary"
              className="flex items-center gap-1.5 bg-green-100 text-green-800 border-green-200"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Investigated
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Open
            </Badge>
          )}
        </div>
      </div>

      {/* High-severity alert */}
      {isHighSeverity && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex gap-3 py-4 px-4">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive">
                Care Inspectorate Notification Required
              </p>
              <p className="text-sm text-destructive/80">
                Category {error.nccMerpCategory} — this error requires
                notification to the Care Inspectorate.{" "}
                {error.careInspectorateNotified
                  ? `Notified on ${formatDate(error.notificationDate)}.`
                  : "Notification is pending."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Error Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Error Type" value={errorTypeLabel} />
            <LabelValue label="Date of Error" value={formatDate(error.errorDate)} />
          </div>
          <LabelValue label="Description" value={error.description} />
          <LabelValue label="Immediate Action Taken" value={error.actionTaken} />
          {error.lessonsLearned && (
            <LabelValue label="Lessons Learned" value={error.lessonsLearned} />
          )}
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <span>Reported by: </span>
              {error.reportedByStaff
                ? `${error.reportedByStaff.firstName} ${error.reportedByStaff.lastName}`
                : "—"}
            </div>
            <div>
              <span>Reported date: </span>
              {error.reportedDate ? formatDate(error.reportedDate) : "—"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investigation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {canInvestigate ? "Investigation" : "Investigation Outcome"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {canInvestigate ? (
            <InvestigationForm
              errorId={id}
              defaultValues={{
                investigationOutcome: error.investigationOutcome ?? undefined,
                careInspectorateNotified: error.careInspectorateNotified,
                notificationDate: error.notificationDate
                  ? new Date(error.notificationDate)
                      .toISOString()
                      .split("T")[0]
                  : undefined,
                lessonsLearned: error.lessonsLearned ?? undefined,
                actionTaken: error.actionTaken ?? undefined,
              }}
            />
          ) : error.investigationOutcome ? (
            <div className="space-y-4">
              <LabelValue
                label="Investigation Outcome"
                value={error.investigationOutcome}
              />
              {error.lessonsLearned && (
                <LabelValue
                  label="Lessons Learned"
                  value={error.lessonsLearned}
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Investigation pending — contact your manager.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

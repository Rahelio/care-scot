"use client";

import { use } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  TriangleAlert,
  Calendar,
  MapPin,
  User,
  Clock,
  BellRing,
  CheckCircle2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";
import { IncidentInvestigationForm } from "@/components/modules/incidents/incident-investigation-form";
import {
  INCIDENT_TYPE_LABELS,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
  CI_NOTIFICATION_TYPE_LABELS,
} from "@/components/modules/incidents/incident-meta";

function LV({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{value || "—"}</p>
    </div>
  );
}

export default function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? "";
  const canManage = ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"].includes(userRole);

  const { data: incident, isPending } = trpc.incidents.getById.useQuery(
    { id },
    { enabled: !!id }
  );

  if (isPending) {
    return <div className="py-12 text-center text-muted-foreground">Loading…</div>;
  }

  if (!incident) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Incident not found.
      </div>
    );
  }

  const severityConfig = SEVERITY_CONFIG[incident.severity];
  const statusConfig = STATUS_CONFIG[incident.status];
  const isHighSeverity =
    incident.severity === "HIGH" || incident.severity === "CRITICAL";
  const actions = incident.actionsToPreventRecurrence as
    | string[]
    | null
    | undefined;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/incidents">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Incidents
        </Link>
      </Button>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold">
              {INCIDENT_TYPE_LABELS[incident.incidentType] ??
                incident.incidentType}
            </h1>
            <Badge
              variant="outline"
              className={`font-semibold ${severityConfig?.badgeClass}`}
            >
              {isHighSeverity && <TriangleAlert className="h-3.5 w-3.5 mr-1" />}
              {severityConfig?.label ?? incident.severity}
            </Badge>
            <Badge
              variant="outline"
              className={`${statusConfig?.badgeClass}`}
            >
              {statusConfig?.label ?? incident.status}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(incident.incidentDate)}
            {incident.incidentTime && ` at ${incident.incidentTime}`}
          </span>
          {incident.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {incident.location}
            </span>
          )}
          {incident.serviceUser && (
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {incident.serviceUser.firstName} {incident.serviceUser.lastName}
            </span>
          )}
          {incident.reportedByUser && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Reported by {incident.reportedByUser.email}
            </span>
          )}
        </div>
      </div>

      {/* RIDDOR badge */}
      {incident.riddorReportable && (
        <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 px-4 py-2.5">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
            RIDDOR Reportable
          </span>
          {incident.riddorReference && (
            <span className="text-sm text-blue-700 dark:text-blue-400">
              — Ref: {incident.riddorReference}
            </span>
          )}
        </div>
      )}

      {/* Incident details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Incident Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LV label="Description" value={incident.description} />
          {incident.witnesses && (
            <LV label="Witnesses" value={incident.witnesses} />
          )}
          {incident.immediateActionTaken && (
            <LV
              label="Immediate Action Taken"
              value={incident.immediateActionTaken}
            />
          )}
          {incident.staffMember && (
            <LV
              label="Staff Member Involved"
              value={`${incident.staffMember.firstName} ${incident.staffMember.lastName}`}
            />
          )}
        </CardContent>
      </Card>

      {/* Investigation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Investigation</CardTitle>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <IncidentInvestigationForm
              incidentId={id}
              defaultValues={{
                investigationNotes: incident.investigationNotes,
                rootCause: incident.rootCause,
                actionsToPreventRecurrence: actions ?? [],
                outcome: incident.outcome,
                status: incident.status,
                riddorReportable: incident.riddorReportable,
                riddorReference: incident.riddorReference,
              }}
            />
          ) : incident.investigationNotes ? (
            <div className="space-y-4">
              <LV
                label="Investigation Notes"
                value={incident.investigationNotes}
              />
              {incident.rootCause && (
                <LV label="Root Cause" value={incident.rootCause} />
              )}
              {actions && actions.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Actions to Prevent Recurrence
                  </p>
                  <ul className="space-y-1">
                    {actions.map((action, i) => (
                      <li
                        key={i}
                        className="text-sm flex items-start gap-2"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {incident.outcome && (
                <LV label="Outcome" value={incident.outcome} />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Investigation pending — contact your manager.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Linked CI Notifications */}
      {incident.careInspNotifications.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BellRing className="h-4 w-4" />
              Care Inspectorate Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {incident.careInspNotifications.map((notif) => (
              <div key={notif.id} className="py-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {CI_NOTIFICATION_TYPE_LABELS[notif.notificationType] ??
                      notif.notificationType}
                  </span>
                  {notif.submittedDate ? (
                    <Badge
                      variant="outline"
                      className="text-xs bg-green-50 text-green-700 border-green-200"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Submitted {formatDate(notif.submittedDate)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Pending
                    </Badge>
                  )}
                </div>
                {notif.careInspectorateReference && (
                  <p className="text-xs text-muted-foreground">
                    Ref: {notif.careInspectorateReference}
                  </p>
                )}
                {notif.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notif.description}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative pl-5 space-y-4">
            <div className="absolute left-0 top-1.5 bottom-1.5 w-px bg-border" />

            <TimelineEntry
              date={incident.incidentDate}
              label="Incident occurred"
            />
            {incident.reportedDate && (
              <TimelineEntry
                date={incident.reportedDate}
                label={`Reported by ${incident.reportedByUser?.email ?? "staff"}`}
              />
            )}
            {incident.status === "UNDER_INVESTIGATION" && (
              <TimelineEntry
                date={incident.updatedAt}
                label="Investigation commenced"
              />
            )}
            {incident.status === "CLOSED" && incident.closedDate && (
              <TimelineEntry
                date={incident.closedDate}
                label="Incident closed"
                highlight
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TimelineEntry({
  date,
  label,
  highlight,
}: {
  date: Date | string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`absolute left-[-3px] h-2 w-2 rounded-full border-2 mt-1 ${
          highlight
            ? "bg-green-600 border-green-600"
            : "bg-background border-muted-foreground"
        }`}
      />
      <div className="pl-3">
        <p
          className={`text-sm ${highlight ? "font-medium" : ""}`}
        >
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{formatDate(date)}</p>
      </div>
    </div>
  );
}

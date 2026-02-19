"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft, Calendar, User, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";
import {
  AuditTool,
  AUDIT_CHECKLIST,
  type FindingItem,
  type ActionItem,
  type Result,
} from "@/components/modules/medication/audit-tool";

type AuditStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

function statusBadge(status: AuditStatus) {
  if (status === "CLOSED")
    return <Badge className="bg-green-100 text-green-800 border-green-200 border">Closed</Badge>;
  if (status === "IN_PROGRESS")
    return <Badge variant="secondary">In Progress</Badge>;
  return <Badge variant="outline">Open</Badge>;
}

function ResultIcon({ result }: { result: Result }) {
  if (result === "PASS")
    return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />;
  if (result === "FAIL")
    return <XCircle className="h-4 w-4 text-red-600 shrink-0" />;
  return <MinusCircle className="h-4 w-4 text-muted-foreground shrink-0" />;
}

function actionStatusBadge(status: ActionItem["status"]) {
  if (status === "COMPLETED")
    return <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200 border">Done</Badge>;
  if (status === "IN_PROGRESS")
    return <Badge variant="secondary" className="text-xs">In Progress</Badge>;
  return <Badge variant="outline" className="text-xs">Open</Badge>;
}

export default function MedicationAuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: audit, isPending } = trpc.medication.audits.getById.useQuery(
    { id },
    { enabled: !!id }
  );

  if (isPending) {
    return <div className="py-12 text-center text-muted-foreground">Loading…</div>;
  }

  if (!audit) {
    return <div className="py-12 text-center text-muted-foreground">Audit not found.</div>;
  }

  const findings = (audit.auditFindings ?? []) as unknown as FindingItem[];
  const actions = (audit.actionsRequired ?? []) as unknown as ActionItem[];

  const totalAnswered = findings.filter((f) => f.result !== "NA").length;
  const passCount = findings.filter((f) => f.result === "PASS").length;
  const failCount = findings.filter((f) => f.result === "FAIL").length;
  const naCount = findings.filter((f) => f.result === "NA").length;
  const score = totalAnswered > 0 ? Math.round((passCount / totalAnswered) * 100) : null;

  const auditIsClosed = audit.status === "CLOSED";

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/medication/audits">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Medication Audits
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold">
              Audit — {formatDate(audit.auditDate)}
            </h1>
            {statusBadge(audit.status as AuditStatus)}
            {score !== null && (
              <Badge
                variant="outline"
                className={`font-bold ${
                  score >= 80
                    ? "bg-green-50 text-green-700 border-green-200"
                    : score >= 60
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {score}% compliance
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(audit.auditDate)}
            </span>
            {audit.auditor && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {audit.auditor.email}
              </span>
            )}
          </div>
        </div>
        {/* Score pills */}
        {totalAnswered > 0 && (
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />{passCount} Pass
            </span>
            <span className="flex items-center gap-1.5 text-red-700 dark:text-red-400">
              <XCircle className="h-4 w-4" />{failCount} Fail
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <MinusCircle className="h-4 w-4" />{naCount} N/A
            </span>
          </div>
        )}
      </div>

      {/* If closed — read-only view */}
      {auditIsClosed ? (
        <div className="space-y-4">
          {AUDIT_CHECKLIST.map(({ section }) => {
            const sectionFindings = findings.filter((f) => f.section === section);
            if (sectionFindings.length === 0) return null;
            const sectionFails = sectionFindings.filter((f) => f.result === "FAIL").length;
            return (
              <Card key={section}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {section}
                    {sectionFails > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {sectionFails} fail{sectionFails !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y">
                  {sectionFindings.map((f) => (
                    <div key={f.id} className="py-2 flex items-start gap-3">
                      <ResultIcon result={f.result} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{f.item}</p>
                        {f.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {f.notes}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-xs font-medium shrink-0 ${
                          f.result === "PASS"
                            ? "text-green-700"
                            : f.result === "FAIL"
                              ? "text-red-700"
                              : "text-muted-foreground"
                        }`}
                      >
                        {f.result === "NA" ? "N/A" : f.result}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}

          {/* Issues */}
          {audit.issuesIdentified && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Issues Identified</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{audit.issuesIdentified}</p>
              </CardContent>
            </Card>
          )}

          {/* Action plan */}
          {actions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Action Plan</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                {actions.map((action, i) => (
                  <div key={action.id} className="py-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">
                        {i + 1}. {action.description}
                      </p>
                      {actionStatusBadge(action.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {action.assignedTo && <span>Assigned: {action.assignedTo}</span>}
                      {action.dueDate && <span>Due: {formatDate(action.dueDate)}</span>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* Edit mode */
        <AuditTool
          auditId={id}
          initialFindings={
            findings.length > 0
              ? findings
              : undefined
          }
          initialActions={actions.length > 0 ? actions : undefined}
          initialIssues={audit.issuesIdentified ?? undefined}
          initialStatus={audit.status as "OPEN" | "IN_PROGRESS" | "CLOSED"}
        />
      )}
    </div>
  );
}

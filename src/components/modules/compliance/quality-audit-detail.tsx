"use client";

import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";
import {
  QUALITY_AUDIT_TYPE_LABELS,
  AUDIT_STATUS_CONFIG,
  type FindingItem,
  type ActionItem,
} from "./compliance-meta";
import { QualityAuditForm } from "./quality-audit-form";

function LV({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{value || "—"}</p>
    </div>
  );
}

export function QualityAuditDetail({ auditId }: { auditId: string }) {
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? "";
  const canManage = ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"].includes(userRole);

  const { data: audit, isPending } =
    trpc.compliance.audits.getById.useQuery(
      { id: auditId },
      { enabled: !!auditId }
    );

  if (isPending) {
    return <div className="py-12 text-center text-muted-foreground">Loading…</div>;
  }
  if (!audit) {
    return <div className="py-12 text-center text-muted-foreground">Audit not found.</div>;
  }

  const sc = AUDIT_STATUS_CONFIG[audit.status];
  const findings = (audit.findings as unknown as FindingItem[]) ?? [];
  const actions = (audit.actionPlan as unknown as ActionItem[]) ?? [];
  const scorable = findings.filter((f) => f.result !== "NA");
  const passCount = scorable.filter((f) => f.result === "PASS").length;
  const score = scorable.length > 0 ? Math.round((passCount / scorable.length) * 100) : null;

  // If open and user can manage, show the edit form
  if (audit.status !== "CLOSED" && canManage) {
    return <QualityAuditForm auditId={auditId} />;
  }

  // Group findings by section
  const sections = new Map<string, FindingItem[]>();
  for (const f of findings) {
    if (!sections.has(f.section)) sections.set(f.section, []);
    sections.get(f.section)!.push(f);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-semibold">
            {QUALITY_AUDIT_TYPE_LABELS[audit.auditType] ?? audit.auditType}
          </h1>
          <Badge variant="outline" className={sc?.badgeClass}>
            {sc?.label ?? audit.status}
          </Badge>
          {score !== null && (
            <span
              className={`text-sm font-semibold ${
                score >= 80
                  ? "text-green-700"
                  : score >= 60
                    ? "text-amber-700"
                    : "text-red-700"
              }`}
            >
              {score}% compliance
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDate(audit.auditDate)} — Auditor: {audit.auditor?.email ?? "Unknown"}
        </p>
      </div>

      {/* Score bar */}
      {score !== null && (
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              score >= 80
                ? "bg-green-600"
                : score >= 60
                  ? "bg-amber-500"
                  : "bg-red-600"
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      )}

      {/* Findings */}
      {sections.size > 0 && (
        <div className="space-y-4">
          {[...sections.entries()].map(([section, items]) => (
            <Card key={section}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{section}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.map((f) => (
                  <div key={f.id} className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className="text-sm">{f.item}</span>
                      {f.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {f.notes}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        f.result === "PASS"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : f.result === "FAIL"
                            ? "bg-red-100 text-red-800 border-red-200"
                            : "bg-muted text-muted-foreground"
                      }
                    >
                      {f.result === "NA" ? "N/A" : f.result}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Issues & Recommendations */}
      {(audit.issues || audit.recommendations) && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {audit.issues && <LV label="Issues Found" value={audit.issues} />}
            {audit.recommendations && (
              <LV label="Recommendations" value={audit.recommendations} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Plan */}
      {actions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Action Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {actions.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2">
                <span className="text-sm">{a.description}</span>
                <div className="flex items-center gap-2">
                  {a.dueDate && (
                    <span className="text-xs text-muted-foreground">
                      Due: {a.dueDate}
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className={
                      a.status === "COMPLETED"
                        ? "bg-green-100 text-green-800 border-green-200"
                        : a.status === "IN_PROGRESS"
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : "bg-muted text-muted-foreground"
                    }
                  >
                    {a.status === "IN_PROGRESS"
                      ? "In Progress"
                      : a.status === "COMPLETED"
                        ? "Completed"
                        : "Open"}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

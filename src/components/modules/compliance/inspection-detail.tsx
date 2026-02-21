"use client";

import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";
import {
  CI_GRADE_AREAS,
  GRADE_LABELS,
  gradeColor,
  type RequirementItem,
} from "./compliance-meta";
import { InspectionForm } from "./inspection-form";

const GRADE_KEYS = Object.entries(CI_GRADE_AREAS);

function LV({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{value || "—"}</p>
    </div>
  );
}

export function InspectionDetail({ inspectionId }: { inspectionId: string }) {
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? "";
  const canManage = ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"].includes(userRole);

  const { data: inspection, isPending } =
    trpc.compliance.inspections.getById.useQuery(
      { id: inspectionId },
      { enabled: !!inspectionId }
    );

  if (isPending) {
    return <div className="py-12 text-center text-muted-foreground">Loading…</div>;
  }
  if (!inspection) {
    return <div className="py-12 text-center text-muted-foreground">Inspection not found.</div>;
  }

  // If manager, show edit form
  if (canManage) {
    return <InspectionForm inspectionId={inspectionId} />;
  }

  const grades = (inspection.grades ?? {}) as Record<string, number>;
  const requirements =
    (inspection.requirements as unknown as RequirementItem[]) ?? [];
  const recommendations =
    (inspection.recommendations as unknown as RequirementItem[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Care Inspectorate Inspection</h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(inspection.inspectionDate)}
          {inspection.inspectorName && ` — Inspector: ${inspection.inspectorName}`}
        </p>
      </div>

      {/* Grades */}
      {Object.keys(grades).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quality Grades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {GRADE_KEYS.map(([key, desc]) => {
              const g = grades[key];
              if (!g) return null;
              return (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="text-sm">{desc}</span>
                  <Badge
                    variant="outline"
                    className={`text-sm font-semibold ${gradeColor(g)}`}
                  >
                    {g} — {GRADE_LABELS[g]}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {inspection.reportSummary && (
        <Card>
          <CardContent className="pt-6">
            <LV label="Report Summary" value={inspection.reportSummary} />
          </CardContent>
        </Card>
      )}

      {/* Requirements */}
      {requirements.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requirements.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm">{r.description}</p>
                  {r.notes && (
                    <p className="text-xs text-muted-foreground">{r.notes}</p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={
                    r.status === "COMPLETED"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : r.status === "IN_PROGRESS"
                        ? "bg-blue-100 text-blue-800 border-blue-200"
                        : "bg-muted text-muted-foreground"
                  }
                >
                  {r.status === "IN_PROGRESS" ? "In Progress" : r.status === "COMPLETED" ? "Met" : "Open"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recommendations.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-2">
                <p className="text-sm flex-1">{r.description}</p>
                <Badge
                  variant="outline"
                  className={
                    r.status === "COMPLETED"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {r.status === "COMPLETED" ? "Done" : r.status === "IN_PROGRESS" ? "In Progress" : "Open"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

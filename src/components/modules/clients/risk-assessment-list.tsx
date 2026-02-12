"use client";

import Link from "next/link";
import { Plus, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { RiskAssessmentType, RiskLevel } from "@prisma/client";

const RISK_LEVEL_CONFIG: Record<RiskLevel, { label: string; icon: React.ElementType; className: string }> = {
  LOW: { label: "Low", icon: CheckCircle, className: "bg-green-100 text-green-800 border-green-200" },
  MEDIUM: { label: "Medium", icon: AlertTriangle, className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  HIGH: { label: "High", icon: AlertCircle, className: "bg-red-100 text-red-800 border-red-200" },
};

const TYPE_LABELS: Record<RiskAssessmentType, string> = {
  ENVIRONMENTAL: "Environmental",
  MOVING_HANDLING: "Moving & Handling",
  FALLS: "Falls",
  NUTRITION_HYDRATION: "Nutrition & Hydration",
  SKIN_INTEGRITY: "Skin Integrity",
  FIRE_SAFETY: "Fire Safety",
  LONE_WORKING: "Lone Working",
  INFECTION_CONTROL: "Infection Control",
  SPECIFIC_CARE_TASK: "Specific Care Task",
};

interface RiskAssessmentListProps {
  serviceUserId: string;
}

export function RiskAssessmentList({ serviceUserId }: RiskAssessmentListProps) {
  const { data: assessments, isPending } = trpc.clients.listRiskAssessments.useQuery({
    serviceUserId,
  });

  if (isPending) {
    return <div className="py-8 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Risk Assessments</h2>
        <Button asChild>
          <Link href={`/clients/${serviceUserId}/risk-assessments/new`}>
            <Plus className="h-4 w-4 mr-2" />
            New Assessment
          </Link>
        </Button>
      </div>

      {!assessments?.length ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-4">No risk assessments recorded yet.</p>
            <Button asChild variant="outline">
              <Link href={`/clients/${serviceUserId}/risk-assessments/new`}>
                Add First Assessment
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assessments.map((assessment) => {
            const riskConfig = RISK_LEVEL_CONFIG[assessment.riskLevel];
            const RiskIcon = riskConfig.icon;
            const isOverdue =
              assessment.nextReviewDate && new Date(assessment.nextReviewDate) < new Date();

            return (
              <Card key={assessment.id} className="flex flex-col">
                <CardContent className="p-4 flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-sm">
                      {TYPE_LABELS[assessment.assessmentType]}
                    </h3>
                    <Badge variant="outline" className={riskConfig.className}>
                      <RiskIcon className="h-3 w-3 mr-1" />
                      {riskConfig.label}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Assessed: {formatDate(assessment.assessmentDate)}</p>
                    {assessment.nextReviewDate && (
                      <p className={isOverdue ? "text-red-600 font-medium" : ""}>
                        Review: {formatDate(assessment.nextReviewDate)}
                        {isOverdue && " — Overdue"}
                      </p>
                    )}
                    {assessment.assessedByUser && (
                      <p>
                        By: {assessment.assessedByUser.name ?? assessment.assessedByUser.email}
                      </p>
                    )}
                  </div>

                  {assessment.assessmentDetail && (
                    <p className="text-xs text-muted-foreground line-clamp-2 border-t pt-2">
                      {assessment.assessmentDetail}
                    </p>
                  )}

                  {assessment.controlMeasures && (
                    <div className="text-xs">
                      <p className="font-medium text-foreground">Control measures:</p>
                      <p className="text-muted-foreground line-clamp-2">
                        {assessment.controlMeasures}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

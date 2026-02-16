"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  CircleDashed,
  Plus,
  History,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RiskAssessmentForm, ASSESSMENT_TYPE_LABELS } from "./risk-assessment-form";
import { formatDate } from "@/lib/utils";
import type { RiskAssessmentType, RiskLevel } from "@prisma/client";

// ── Types ──────────────────────────────────────────────────────────────────────

type AssessmentStatus = "not_assessed" | "completed" | "due_for_review" | "overdue";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Assessment = Record<string, any>;

// ── Config ─────────────────────────────────────────────────────────────────────

const ALL_TYPES = Object.keys(ASSESSMENT_TYPE_LABELS) as RiskAssessmentType[];

const STATUS_CONFIG: Record<
  AssessmentStatus,
  { label: string; icon: React.ElementType; cardClass: string; badgeClass: string }
> = {
  not_assessed: {
    label: "Not Assessed",
    icon: CircleDashed,
    cardClass: "border-muted",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    cardClass: "border-green-200",
    badgeClass: "bg-green-100 text-green-800 border-green-200",
  },
  due_for_review: {
    label: "Due for Review",
    icon: Clock,
    cardClass: "border-yellow-300",
    badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  overdue: {
    label: "Overdue",
    icon: AlertCircle,
    cardClass: "border-red-300",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
  },
};

const RISK_LEVEL_CONFIG: Record<
  RiskLevel,
  { label: string; icon: React.ElementType; className: string }
> = {
  LOW: { label: "Low", icon: CheckCircle2, className: "bg-green-100 text-green-800 border-green-200" },
  MEDIUM: { label: "Medium", icon: AlertTriangle, className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  HIGH: { label: "High", icon: AlertCircle, className: "bg-red-100 text-red-800 border-red-200" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getStatus(assessment?: Assessment): AssessmentStatus {
  if (!assessment) return "not_assessed";
  if (!assessment.nextReviewDate) return "completed";
  const now = new Date();
  const review = new Date(assessment.nextReviewDate);
  if (review < now) return "overdue";
  const daysUntil = Math.ceil((review.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntil <= 30 ? "due_for_review" : "completed";
}

// ── History sub-component ──────────────────────────────────────────────────────

function AssessmentHistory({
  serviceUserId,
  assessmentType,
}: {
  serviceUserId: string;
  assessmentType: RiskAssessmentType;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: history, isPending } = trpc.clients.getRiskAssessmentHistory.useQuery({
    serviceUserId,
    assessmentType,
  });

  if (isPending) return <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>;
  if (!history?.length) return <p className="text-sm text-muted-foreground py-4 text-center">No history.</p>;

  return (
    <div className="space-y-2">
      {history.map((item) => {
        const isOpen = expanded === item.id;
        const riskCfg = RISK_LEVEL_CONFIG[item.riskLevel as RiskLevel];
        return (
          <div key={item.id} className="rounded-lg border text-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
              onClick={() => setExpanded(isOpen ? null : item.id)}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className={riskCfg.className}>
                  <riskCfg.icon className="h-3 w-3 mr-1" />
                  {riskCfg.label}
                </Badge>
                <span className="text-muted-foreground">
                  {formatDate(item.assessmentDate)}
                  {item.assessedByUser && (
                    <> · {item.assessedByUser.name ?? item.assessedByUser.email}</>
                  )}
                  {item.status === "SUPERSEDED" && (
                    <span className="ml-2 text-xs text-muted-foreground/70">(superseded)</span>
                  )}
                </span>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
            {isOpen && (
              <div className="border-t px-3 py-3 space-y-3 bg-muted/10">
                {item.assessmentDetail && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Assessment Detail
                    </p>
                    <p className="whitespace-pre-wrap">{item.assessmentDetail}</p>
                  </div>
                )}
                {item.controlMeasures && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Control Measures
                    </p>
                    <p className="whitespace-pre-wrap">{item.controlMeasures}</p>
                  </div>
                )}
                {item.nextReviewDate && (
                  <p className="text-muted-foreground text-xs">
                    Review date: {formatDate(item.nextReviewDate)}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Detail dialog ──────────────────────────────────────────────────────────────

function DetailDialog({
  serviceUserId,
  assessment,
  onClose,
  onReview,
}: {
  serviceUserId: string;
  assessment: Assessment;
  onClose: () => void;
  onReview: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const riskCfg = RISK_LEVEL_CONFIG[assessment.riskLevel as RiskLevel];
  const status = getStatus(assessment);
  const statusCfg = STATUS_CONFIG[status];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge variant="outline" className={riskCfg.className}>
          <riskCfg.icon className="h-3 w-3 mr-1" />
          {riskCfg.label} Risk
        </Badge>
        <Badge variant="outline" className={statusCfg.badgeClass}>
          <statusCfg.icon className="h-3 w-3 mr-1" />
          {statusCfg.label}
        </Badge>
      </div>

      <div className="text-sm text-muted-foreground space-y-1 mb-4">
        <p>Assessed: {formatDate(assessment.assessmentDate)}</p>
        {assessment.assessedByUser && (
          <p>By: {assessment.assessedByUser.name ?? assessment.assessedByUser.email}</p>
        )}
        {assessment.nextReviewDate && (
          <p>
            Next review:{" "}
            <span className={status === "overdue" ? "text-red-600 font-medium" : ""}>
              {formatDate(assessment.nextReviewDate)}
              {status === "overdue" && " — Overdue"}
            </span>
          </p>
        )}
      </div>

      {assessment.assessmentDetail && (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Assessment Detail
          </p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {assessment.assessmentDetail}
          </p>
        </div>
      )}

      {assessment.controlMeasures && (
        <>
          <Separator className="mb-4" />
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Control Measures
            </p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {assessment.controlMeasures}
            </p>
          </div>
        </>
      )}

      <Separator className="mb-4" />

      {/* History toggle */}
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        onClick={() => setShowHistory((v) => !v)}
      >
        <History className="h-4 w-4" />
        {showHistory ? "Hide history" : "View history"}
        {showHistory ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {showHistory && (
        <div className="mb-4">
          <AssessmentHistory
            serviceUserId={serviceUserId}
            assessmentType={assessment.assessmentType as RiskAssessmentType}
          />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={onReview}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Review &amp; Update
        </Button>
      </div>
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface RiskAssessmentListProps {
  serviceUserId: string;
}

type DialogState =
  | null
  | { mode: "view"; type: RiskAssessmentType }
  | { mode: "form"; type: RiskAssessmentType };

export function RiskAssessmentList({ serviceUserId }: RiskAssessmentListProps) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const utils = trpc.useUtils();

  const { data: assessments, isPending } = trpc.clients.listRiskAssessments.useQuery({
    serviceUserId,
    status: "ACTIVE",
  });

  const assessmentMap = new Map<RiskAssessmentType, Assessment>(
    (assessments ?? []).map((a) => [a.assessmentType as RiskAssessmentType, a])
  );

  function handleSaved() {
    setDialog(null);
    utils.clients.listRiskAssessments.invalidate({ serviceUserId });
  }

  const activeAssessment =
    dialog?.type ? assessmentMap.get(dialog.type) : undefined;

  const dialogTitle =
    dialog?.mode === "form"
      ? activeAssessment
        ? `Review: ${ASSESSMENT_TYPE_LABELS[dialog.type]}`
        : `New Assessment: ${dialog?.type ? ASSESSMENT_TYPE_LABELS[dialog.type] : ""}`
      : dialog?.type
      ? ASSESSMENT_TYPE_LABELS[dialog.type]
      : "";

  if (isPending) {
    return <div className="py-8 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Risk Assessments</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {assessments?.length ?? 0} of {ALL_TYPES.length} completed
          </p>
        </div>
        <Button onClick={() => setDialog({ mode: "form", type: "ENVIRONMENTAL" })}>
          <Plus className="h-4 w-4 mr-2" />
          New Assessment
        </Button>
      </div>

      {/* Grid of all 9 types */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ALL_TYPES.map((type) => {
          const assessment = assessmentMap.get(type);
          const status = getStatus(assessment);
          const statusCfg = STATUS_CONFIG[status];
          const StatusIcon = statusCfg.icon;

          return (
            <Card
              key={type}
              className={`flex flex-col transition-shadow hover:shadow-sm ${statusCfg.cardClass}`}
            >
              <CardContent className="p-4 flex-1 flex flex-col gap-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium leading-snug">
                    {ASSESSMENT_TYPE_LABELS[type]}
                  </h3>
                  <Badge variant="outline" className={`shrink-0 text-xs ${statusCfg.badgeClass}`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusCfg.label}
                  </Badge>
                </div>

                {/* Assessment data */}
                {assessment ? (
                  <>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const riskCfg = RISK_LEVEL_CONFIG[assessment.riskLevel as RiskLevel];
                        const RiskIcon = riskCfg.icon;
                        return (
                          <Badge variant="outline" className={`text-xs ${riskCfg.className}`}>
                            <RiskIcon className="h-3 w-3 mr-1" />
                            {riskCfg.label} Risk
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Assessed: {formatDate(assessment.assessmentDate)}</p>
                      {assessment.nextReviewDate && (
                        <p className={status === "overdue" ? "text-red-600 font-medium" : ""}>
                          Review: {formatDate(assessment.nextReviewDate)}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No assessment recorded</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-auto pt-1">
                  {assessment ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => setDialog({ mode: "view", type })}
                      >
                        View / Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => setDialog({ mode: "form", type })}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Review
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setDialog({ mode: "form", type })}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Assess
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog */}
      <Dialog open={dialog !== null} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>

          {dialog?.mode === "view" && activeAssessment && (
            <DetailDialog
              serviceUserId={serviceUserId}
              assessment={activeAssessment}
              onClose={() => setDialog(null)}
              onReview={() => setDialog({ mode: "form", type: dialog.type })}
            />
          )}

          {dialog?.mode === "form" && (
            <RiskAssessmentForm
              serviceUserId={serviceUserId}
              assessmentType={dialog.type}
              existingAssessment={activeAssessment}
              onSaved={handleSaved}
              onCancel={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  CheckCircle,
  Clock,
  Archive,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  FilePenLine,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PersonalPlanForm } from "./personal-plan-form";
import { getPlanWarningStatus } from "@/lib/plan-warning";
import { formatDate } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PersonalPlanViewProps {
  serviceUserId: string;
  /** Service user's createdAt — used to calculate the 28-day plan deadline */
  serviceUserCreatedAt: Date;
  userRole?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  DRAFT: { label: "Draft", icon: Clock, className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  ACTIVE: { label: "Active", icon: CheckCircle, className: "bg-green-100 text-green-800 border-green-200" },
  SUPERSEDED: { label: "Superseded", icon: Archive, className: "bg-slate-100 text-slate-600 border-slate-200" },
} as const;

const PLAN_SECTIONS = [
  { key: "initialAssessment", label: "Initial Assessment" },
  { key: "healthNeeds", label: "Health Needs" },
  { key: "welfareNeeds", label: "Welfare Needs" },
  { key: "personalCareRequirements", label: "Personal Care Requirements" },
  { key: "howNeedsWillBeMet", label: "How Needs Will Be Met" },
  { key: "wishesAndPreferences", label: "Wishes and Preferences" },
  { key: "goalsAndOutcomes", label: "Goals and Outcomes" },
] as const;

const MANAGER_ROLES = ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"];

// ── Warning banner ─────────────────────────────────────────────────────────────

function PlanDeadlineBanner({ createdAt, hasAnyPlan }: { createdAt: Date; hasAnyPlan: boolean }) {
  if (hasAnyPlan) return null;

  const warning = getPlanWarningStatus(createdAt, false);
  const { daysSinceStart } = warning;
  const daysRemaining = 28 - daysSinceStart;

  if (warning.level === "overdue") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">OVERDUE — Personal plan required</p>
          <p>{warning.message}</p>
        </div>
      </div>
    );
  }
  if (warning.level === "critical") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{warning.message}</p>
      </div>
    );
  }
  if (warning.level === "warning") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{warning.message}</p>
      </div>
    );
  }
  // level === "none" → < 14 days, show info
  return (
    <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        Service started {daysSinceStart === 0 ? "today" : `${daysSinceStart} day${daysSinceStart !== 1 ? "s" : ""} ago`}.
        {" "}Personal plan due within{" "}
        <span className="font-medium">{daysRemaining} day{daysRemaining !== 1 ? "s" : ""}</span>.
      </p>
    </div>
  );
}

// ── Plan content (read-only) ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PlanContent({ plan, compact = false }: { plan: any; compact?: boolean }) {
  const populated = PLAN_SECTIONS.filter((s) => plan[s.key]);
  if (populated.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No content recorded.</p>;
  }

  return (
    <div className="space-y-4">
      {populated.map((section, i) => (
        <div key={section.key}>
          {i > 0 && <Separator className="mb-4" />}
          <h4 className="text-sm font-semibold mb-1.5">{section.label}</h4>
          <p
            className={
              compact
                ? "text-sm text-muted-foreground line-clamp-3"
                : "text-sm whitespace-pre-wrap leading-relaxed"
            }
          >
            {plan[section.key]}
          </p>
        </div>
      ))}

      {(plan.consultedWithServiceUser || plan.consultedWithRepresentative) && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Consultation</h4>
            {plan.consultedWithServiceUser && (
              <div className="text-sm">
                <p className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  Service user consulted
                </p>
                {plan.consultationNotes && (
                  <p className="text-muted-foreground mt-1 ml-5">{plan.consultationNotes}</p>
                )}
              </div>
            )}
            {plan.consultedWithRepresentative && (
              <div className="text-sm">
                <p className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  Representative consulted
                </p>
                {plan.repConsultationNotes && (
                  <p className="text-muted-foreground mt-1 ml-5">{plan.repConsultationNotes}</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── History accordion ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HistoryAccordion({ plans }: { plans: any[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (plans.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        Previous versions ({plans.length})
      </h3>
      {plans.map((plan) => {
        const isOpen = expanded === plan.id;
        return (
          <div key={plan.id} className="rounded-lg border">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              onClick={() => setExpanded(isOpen ? null : plan.id)}
            >
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={STATUS_CONFIG.SUPERSEDED.className}
                >
                  v{plan.planVersion}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatDate(plan.createdDate)}
                  {plan.approvedAt && ` · Approved ${formatDate(plan.approvedAt)}`}
                  {plan.createdByUser && (
                    <> · {plan.createdByUser.name ?? plan.createdByUser.email}</>
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
              <div className="border-t px-4 py-4 bg-muted/10">
                <PlanContent plan={plan} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function PersonalPlanView({
  serviceUserId,
  serviceUserCreatedAt,
  userRole,
}: PersonalPlanViewProps) {
  const utils = trpc.useUtils();
  const [formMode, setFormMode] = useState<"hidden" | "create" | "edit">("hidden");

  const { data: plans, isPending } = trpc.clients.listPersonalPlans.useQuery({ serviceUserId });

  const approveMutation = trpc.clients.approvePlan.useMutation({
    onSuccess: () => {
      toast.success("Plan approved and activated");
      utils.clients.listPersonalPlans.invalidate({ serviceUserId });
    },
    onError: (err) => toast.error(err.message),
  });

  if (isPending) {
    return <div className="py-8 text-center text-muted-foreground">Loading…</div>;
  }

  const draftPlan = plans?.find((p) => p.status === "DRAFT");
  const activePlan = plans?.find((p) => p.status === "ACTIVE");
  const supersededPlans = plans?.filter((p) => p.status === "SUPERSEDED") ?? [];
  const hasAnyPlan = (plans?.length ?? 0) > 0;

  const isManager = MANAGER_ROLES.includes(userRole ?? "");

  function handleSaved() {
    setFormMode("hidden");
    utils.clients.listPersonalPlans.invalidate({ serviceUserId });
  }

  // ── No plan state ────────────────────────────────────────────────────────────
  if (!hasAnyPlan && formMode === "hidden") {
    return (
      <div className="space-y-4">
        <PlanDeadlineBanner createdAt={serviceUserCreatedAt} hasAnyPlan={false} />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-muted-foreground">No personal plan has been created yet.</p>
            <Button onClick={() => setFormMode("create")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Personal Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Create / edit form visible ───────────────────────────────────────────────
  if (formMode !== "hidden") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {formMode === "create"
              ? activePlan
                ? `New Version (v${(activePlan.planVersion) + 1})`
                : "Create Personal Plan"
              : `Edit Draft — v${draftPlan?.planVersion}`}
          </h2>
          {formMode === "create" && (
            <p className="text-sm text-muted-foreground">
              Saves as <strong>Draft</strong> — a manager must approve to activate
            </p>
          )}
        </div>
        <PersonalPlanForm
          serviceUserId={serviceUserId}
          mode={formMode === "edit" && draftPlan ? "edit" : "create"}
          planId={formMode === "edit" ? draftPlan?.id : undefined}
          prefillFrom={formMode === "create" && activePlan ? activePlan : undefined}
          onSaved={handleSaved}
          onCancel={() => setFormMode("hidden")}
        />
      </div>
    );
  }

  // ── Normal view ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Draft plan — editable */}
      {draftPlan && (
        <Card className="border-yellow-300 bg-yellow-50/30">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">
                    Draft — Version {draftPlan.planVersion}
                  </CardTitle>
                  <Badge variant="outline" className={STATUS_CONFIG.DRAFT.className}>
                    <Clock className="h-3 w-3 mr-1" />
                    Draft
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Created {formatDate(draftPlan.createdDate)}
                  {draftPlan.createdByUser && (
                    <> by {draftPlan.createdByUser.name ?? draftPlan.createdByUser.email}</>
                  )}
                  {" "}· Awaiting manager approval
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFormMode("edit")}
                >
                  <FilePenLine className="h-4 w-4 mr-1.5" />
                  Edit Draft
                </Button>
                {isManager && (
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate({ id: draftPlan.id })}
                    disabled={approveMutation.isPending}
                  >
                    {approveMutation.isPending ? "Approving…" : "Approve & Activate"}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <PlanContent plan={draftPlan} />
          </CardContent>
        </Card>
      )}

      {/* Active plan — read-only */}
      {activePlan && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">
                    Current Plan — Version {activePlan.planVersion}
                  </CardTitle>
                  <Badge variant="outline" className={STATUS_CONFIG.ACTIVE.className}>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                  <p>
                    Created {formatDate(activePlan.createdDate)}
                    {activePlan.createdByUser && (
                      <> by {activePlan.createdByUser.name ?? activePlan.createdByUser.email}</>
                    )}
                  </p>
                  {activePlan.approvedAt && (
                    <p>
                      Approved {formatDate(activePlan.approvedAt)}
                      {activePlan.approvedByUser && (
                        <> by {activePlan.approvedByUser.name ?? activePlan.approvedByUser.email}</>
                      )}
                    </p>
                  )}
                  {activePlan.nextReviewDate && (
                    <p>Next review: {formatDate(activePlan.nextReviewDate)}</p>
                  )}
                </div>
              </div>
              {!draftPlan && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFormMode("create")}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create New Version
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <PlanContent plan={activePlan} />
          </CardContent>
        </Card>
      )}

      {/* History */}
      {supersededPlans.length > 0 && <HistoryAccordion plans={supersededPlans} />}
    </div>
  );
}

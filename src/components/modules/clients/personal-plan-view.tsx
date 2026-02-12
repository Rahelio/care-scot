"use client";

import Link from "next/link";
import { Plus, CheckCircle, Clock, Archive } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";

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

interface PersonalPlanViewProps {
  serviceUserId: string;
  planId?: string;
  userRole?: string;
}

export function PersonalPlanView({ serviceUserId, planId, userRole }: PersonalPlanViewProps) {
  const utils = trpc.useUtils();

  const { data: plans, isPending } = trpc.clients.listPersonalPlans.useQuery({
    serviceUserId,
  });

  const approveMutation = trpc.clients.approvePlan.useMutation({
    onSuccess: () => {
      toast.success("Plan approved and activated");
      utils.clients.listPersonalPlans.invalidate({ serviceUserId });
    },
    onError: (err) => toast.error(err.message),
  });

  if (isPending) {
    return <div className="py-8 text-center text-muted-foreground">Loading plans…</div>;
  }

  const activePlan = plans?.find((p) => p.status === "ACTIVE");
  const draftPlans = plans?.filter((p) => p.status === "DRAFT") ?? [];
  const supersededPlans = plans?.filter((p) => p.status === "SUPERSEDED") ?? [];

  const displayPlan = planId
    ? plans?.find((p) => p.id === planId)
    : draftPlans[0] ?? activePlan;

  const isManager = ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"].includes(userRole ?? "");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Personal Plan</h2>
          {activePlan && (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
              Active v{activePlan.planVersion}
            </Badge>
          )}
        </div>
        <Button asChild>
          <Link href={`/clients/${serviceUserId}/personal-plan/new`}>
            <Plus className="h-4 w-4 mr-2" />
            New Plan Version
          </Link>
        </Button>
      </div>

      {!plans?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No personal plan has been created yet.</p>
            <Button asChild>
              <Link href={`/clients/${serviceUserId}/personal-plan/new`}>
                Create Personal Plan
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {draftPlans.length > 0 && (
            <div className="space-y-4">
              {draftPlans.map((plan) => (
                <Card key={plan.id} className="border-yellow-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        Version {plan.planVersion} — Draft
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={STATUS_CONFIG.DRAFT.className}>
                          Draft
                        </Badge>
                        {isManager && (
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate({ id: plan.id })}
                            disabled={approveMutation.isPending}
                          >
                            {approveMutation.isPending ? "Approving…" : "Approve & Activate"}
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Created {formatDate(plan.createdDate)} by{" "}
                      {plan.createdByUser?.name ?? plan.createdByUser?.email ?? "Unknown"}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <PlanContent plan={plan} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activePlan && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Version {activePlan.planVersion} — Current Plan
                  </CardTitle>
                  <Badge variant="outline" className={STATUS_CONFIG.ACTIVE.className}>
                    Active
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  <p>
                    Created {formatDate(activePlan.createdDate)} by{" "}
                    {activePlan.createdByUser?.name ?? activePlan.createdByUser?.email ?? "Unknown"}
                  </p>
                  {activePlan.approvedAt && (
                    <p>
                      Approved {formatDate(activePlan.approvedAt)} by{" "}
                      {activePlan.approvedByUser?.name ?? activePlan.approvedByUser?.email ?? "Unknown"}
                    </p>
                  )}
                  {activePlan.nextReviewDate && (
                    <p>Next review: {formatDate(activePlan.nextReviewDate)}</p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <PlanContent plan={activePlan} />
              </CardContent>
            </Card>
          )}

          {supersededPlans.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground py-2">
                {supersededPlans.length} previous version{supersededPlans.length !== 1 ? "s" : ""} (read-only)
              </summary>
              <div className="mt-3 space-y-3">
                {supersededPlans.map((plan) => (
                  <Card key={plan.id} className="opacity-70">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm text-muted-foreground">
                          Version {plan.planVersion}
                        </CardTitle>
                        <Badge variant="outline" className={STATUS_CONFIG.SUPERSEDED.className}>
                          Superseded
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(plan.createdDate)}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <PlanContent plan={plan} compact />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function PlanContent({
  plan,
  compact = false,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plan: any;
  compact?: boolean;
}) {
  const hasContent = PLAN_SECTIONS.some((s) => plan[s.key]);

  if (!hasContent) {
    return <p className="text-sm text-muted-foreground">No content recorded.</p>;
  }

  return (
    <div className="space-y-4">
      {PLAN_SECTIONS.filter((s) => plan[s.key]).map((section, i) => (
        <div key={section.key}>
          {i > 0 && <Separator className="mb-4" />}
          <h4 className="text-sm font-medium mb-1">{section.label}</h4>
          <p className={compact ? "text-sm text-muted-foreground line-clamp-3" : "text-sm whitespace-pre-wrap"}>
            {plan[section.key]}
          </p>
        </div>
      ))}

      {(plan.consultedWithServiceUser || plan.consultedWithRepresentative) && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Consultation</h4>
            {plan.consultedWithServiceUser && (
              <div>
                <p className="text-sm">✓ Service user consulted</p>
                {plan.consultationNotes && (
                  <p className="text-sm text-muted-foreground">{plan.consultationNotes}</p>
                )}
              </div>
            )}
            {plan.consultedWithRepresentative && (
              <div>
                <p className="text-sm">✓ Representative consulted</p>
                {plan.repConsultationNotes && (
                  <p className="text-sm text-muted-foreground">{plan.repConsultationNotes}</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

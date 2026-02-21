"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";
import {
  POLICY_CATEGORY_LABELS,
  POLICY_STATUS_CONFIG,
} from "./compliance-meta";

function LV({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}

export function PolicyDetail({ policyId }: { policyId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const utils = trpc.useUtils();
  const userRole = session?.user?.role ?? "";
  const staffMemberId = session?.user?.staffMemberId;
  const canManage = ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"].includes(userRole);

  const { data: policy, isPending } =
    trpc.compliance.policies.getById.useQuery(
      { id: policyId },
      { enabled: !!policyId }
    );

  const { data: ackStatus } =
    trpc.compliance.policies.getAcknowledgmentStatus.useQuery(
      { policyId },
      { enabled: !!policyId }
    );

  const acknowledgeMut = trpc.compliance.policies.acknowledge.useMutation({
    onSuccess: () => {
      toast.success("Policy acknowledged");
      utils.compliance.policies.getAcknowledgmentStatus.invalidate({ policyId });
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMut = trpc.compliance.policies.update.useMutation({
    onSuccess: (result) => {
      toast.success("Policy updated");
      utils.compliance.policies.invalidate();
      // If new version was created, redirect to the new policy
      if (result.id !== policyId) {
        router.push(`/compliance/policies/${result.id}`);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const [editMode, setEditMode] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editNextReview, setEditNextReview] = useState("");

  if (isPending) {
    return <div className="py-12 text-center text-muted-foreground">Loading…</div>;
  }
  if (!policy) {
    return <div className="py-12 text-center text-muted-foreground">Policy not found.</div>;
  }

  const sc = POLICY_STATUS_CONFIG[policy.status];
  const hasAcknowledged = ackStatus?.acknowledgments.some(
    (a) => a.staffMemberId === staffMemberId
  );
  const ackPercent =
    ackStatus && ackStatus.totalStaff > 0
      ? Math.round((ackStatus.acknowledgedCount / ackStatus.totalStaff) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-semibold">{policy.policyName}</h1>
          <Badge variant="outline" className={sc?.badgeClass}>
            {sc?.label ?? policy.status}
          </Badge>
          <span className="text-sm text-muted-foreground">v{policy.version}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {POLICY_CATEGORY_LABELS[policy.policyCategory] ?? policy.policyCategory}
        </p>
      </div>

      {/* Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Policy Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <LV label="Effective Date" value={policy.effectiveDate ? formatDate(policy.effectiveDate) : null} />
          <LV label="Last Review" value={policy.reviewDate ? formatDate(policy.reviewDate) : null} />
          <LV label="Next Review" value={policy.nextReviewDate ? formatDate(policy.nextReviewDate) : null} />
          <LV label="Approved By" value={policy.approvedByUser?.email ?? null} />
        </CardContent>
      </Card>

      {/* Acknowledgment Progress */}
      {policy.status === "ACTIVE" && ackStatus && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Staff Acknowledgment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>
                {ackStatus.acknowledgedCount} of {ackStatus.totalStaff} staff
                acknowledged
              </span>
              <span className="font-medium">{ackPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-green-600 transition-all"
                style={{ width: `${ackPercent}%` }}
              />
            </div>
            {staffMemberId && !hasAcknowledged && (
              <Button
                size="sm"
                onClick={() => acknowledgeMut.mutate({ policyId })}
                disabled={acknowledgeMut.isPending}
              >
                {acknowledgeMut.isPending
                  ? "Acknowledging…"
                  : "Acknowledge Policy"}
              </Button>
            )}
            {hasAcknowledged && (
              <p className="text-sm text-green-700">You have acknowledged this policy.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Management Actions */}
      {canManage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Management Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editMode ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={editStatus}
                      onValueChange={setEditStatus}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="ARCHIVED">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Next Review Date</label>
                    <Input
                      type="date"
                      value={editNextReview}
                      onChange={(e) => setEditNextReview(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      updateMut.mutate({
                        id: policyId,
                        status: editStatus as never,
                        nextReviewDate: editNextReview || undefined,
                      })
                    }
                    disabled={updateMut.isPending}
                  >
                    Save Changes
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateMut.mutate({
                        id: policyId,
                        newVersion: true,
                        status: "DRAFT",
                      })
                    }
                    disabled={updateMut.isPending}
                  >
                    Publish New Version
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditMode(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditStatus(policy.status);
                  setEditNextReview(
                    policy.nextReviewDate
                      ? new Date(policy.nextReviewDate)
                          .toISOString()
                          .split("T")[0]
                      : ""
                  );
                  setEditMode(true);
                }}
              >
                Edit Policy
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

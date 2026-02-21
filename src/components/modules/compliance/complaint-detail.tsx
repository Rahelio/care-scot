"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { COMPLAINT_STATUS_CONFIG } from "./compliance-meta";

function LV({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{value || "—"}</p>
    </div>
  );
}

export function ComplaintDetail({ complaintId }: { complaintId: string }) {
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const userRole = session?.user?.role ?? "";
  const canManage = ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"].includes(userRole);

  const { data: complaint, isPending } =
    trpc.compliance.complaints.getById.useQuery(
      { id: complaintId },
      { enabled: !!complaintId }
    );

  const updateMut = trpc.compliance.complaints.update.useMutation({
    onSuccess: () => {
      toast.success("Complaint updated");
      utils.compliance.complaints.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Investigation form state
  const [investigation, setInvestigation] = useState("");
  const [outcome, setOutcome] = useState("");
  const [actions, setActions] = useState<string[]>([]);
  const [newAction, setNewAction] = useState("");
  const [responseSentDate, setResponseSentDate] = useState("");
  const [responseMethod, setResponseMethod] = useState("");
  const [referredToCI, setReferredToCI] = useState(false);
  const [referralDate, setReferralDate] = useState("");
  const [satisfaction, setSatisfaction] = useState("");
  const [lessonsLearned, setLessonsLearned] = useState("");
  const [status, setStatus] = useState("");
  const [formLoaded, setFormLoaded] = useState(false);

  // Load defaults from complaint when it arrives
  if (complaint && !formLoaded) {
    setInvestigation(complaint.investigationCarriedOut ?? "");
    setOutcome(complaint.outcome ?? "");
    setActions(
      (complaint.actionsTaken as unknown as string[] | null) ?? []
    );
    setResponseSentDate(
      complaint.responseSentDate
        ? new Date(complaint.responseSentDate).toISOString().split("T")[0]
        : ""
    );
    setResponseMethod(complaint.responseMethod ?? "");
    setReferredToCI(complaint.referredToCareInspectorate ?? false);
    setReferralDate(
      complaint.referralDate
        ? new Date(complaint.referralDate).toISOString().split("T")[0]
        : ""
    );
    setSatisfaction(complaint.satisfactionWithOutcome ?? "");
    setLessonsLearned(complaint.lessonsLearned ?? "");
    setStatus(complaint.status);
    setFormLoaded(true);
  }

  if (isPending) {
    return <div className="py-12 text-center text-muted-foreground">Loading…</div>;
  }
  if (!complaint) {
    return <div className="py-12 text-center text-muted-foreground">Complaint not found.</div>;
  }

  const sc = COMPLAINT_STATUS_CONFIG[complaint.status];

  function handleAddAction() {
    const trimmed = newAction.trim();
    if (!trimmed) return;
    setActions((prev) => [...prev, trimmed]);
    setNewAction("");
  }

  function handleSave() {
    updateMut.mutate({
      id: complaintId,
      investigationCarriedOut: investigation || undefined,
      outcome: outcome || undefined,
      actionsTaken: actions.length > 0 ? actions : undefined,
      responseSentDate: responseSentDate || undefined,
      responseMethod: responseMethod || undefined,
      referredToCareInspectorate: referredToCI,
      referralDate: referredToCI && referralDate ? referralDate : undefined,
      satisfactionWithOutcome: satisfaction || undefined,
      lessonsLearned: lessonsLearned || undefined,
      status: status as never,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-semibold">Complaint</h1>
          <Badge variant="outline" className={sc?.badgeClass}>
            {sc?.label ?? complaint.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Received {formatDate(complaint.dateReceived)} from{" "}
          {complaint.complainantName}
          {complaint.complainantRelationship &&
            ` (${complaint.complainantRelationship})`}
        </p>
      </div>

      {/* SLA Warning */}
      {complaint.isOverdue && complaint.status !== "RESOLVED" && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="text-sm font-medium text-red-800">
            SLA OVERDUE — response was due by{" "}
            {formatDate(complaint.slaDeadline)}
          </span>
        </div>
      )}

      {/* Complaint Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Complaint Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LV label="Nature of Complaint" value={complaint.natureOfComplaint} />
          {complaint.serviceUser && (
            <LV
              label="Service User"
              value={`${complaint.serviceUser.firstName} ${complaint.serviceUser.lastName}`}
            />
          )}
        </CardContent>
      </Card>

      {/* Investigation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Investigation & Outcome</CardTitle>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Investigation Carried Out</label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={investigation}
                  onChange={(e) => setInvestigation(e.target.value)}
                  placeholder="Describe the investigation…"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Outcome</label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="Investigation outcome…"
                />
              </div>

              {/* Actions */}
              <div>
                <label className="text-sm font-medium">Actions Taken</label>
                <div className="space-y-2 mt-1">
                  {actions.map((action, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <span className="text-sm flex-1">{action}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setActions((prev) => prev.filter((_, j) => j !== i))
                        }
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add action…"
                      value={newAction}
                      onChange={(e) => setNewAction(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddAction();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddAction}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Response Sent Date</label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={responseSentDate}
                    onChange={(e) => setResponseSentDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Response Method</label>
                  <Input
                    className="mt-1"
                    placeholder="e.g. Letter, Phone, Email"
                    value={responseMethod}
                    onChange={(e) => setResponseMethod(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={referredToCI}
                  onCheckedChange={(v) => setReferredToCI(!!v)}
                />
                <label className="text-sm">Referred to Care Inspectorate</label>
              </div>
              {referredToCI && (
                <div className="w-48">
                  <label className="text-sm font-medium">Referral Date</label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={referralDate}
                    onChange={(e) => setReferralDate(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Satisfaction with Outcome</label>
                <Select value={satisfaction} onValueChange={setSatisfaction}>
                  <SelectTrigger className="mt-1 w-[200px]">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SATISFIED">Satisfied</SelectItem>
                    <SelectItem value="PARTIALLY_SATISFIED">
                      Partially Satisfied
                    </SelectItem>
                    <SelectItem value="DISSATISFIED">Dissatisfied</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Lessons Learned</label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={lessonsLearned}
                  onChange={(e) => setLessonsLearned(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="mt-1 w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="ESCALATED">Escalated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSave}
                disabled={updateMut.isPending}
              >
                {updateMut.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          ) : complaint.investigationCarriedOut ? (
            <div className="space-y-4">
              <LV label="Investigation" value={complaint.investigationCarriedOut} />
              {complaint.outcome && <LV label="Outcome" value={complaint.outcome} />}
              {complaint.lessonsLearned && (
                <LV label="Lessons Learned" value={complaint.lessonsLearned} />
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";

export function AnnualReturnForm({ returnId }: { returnId?: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [year, setYear] = useState(new Date().getFullYear());
  const [deadlineDate, setDeadlineDate] = useState("");
  const [selfEvaluation, setSelfEvaluation] = useState("");
  const [complaintsSummary, setComplaintsSummary] = useState("");
  const [incidentsSummary, setIncidentsSummary] = useState("");
  const [improvementsMade, setImprovementsMade] = useState("");
  const [plannedImprovements, setPlannedImprovements] = useState("");
  const [serviceUserCount, setServiceUserCount] = useState<number | undefined>();
  const [staffCount, setStaffCount] = useState<number | undefined>();
  const [status, setStatus] = useState("DRAFT");
  const [submissionDate, setSubmissionDate] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Load existing for edit
  const { data: existing } = trpc.compliance.annualReturns.list.useQuery(
    undefined,
    { enabled: !!returnId }
  );

  const existingReturn = existing?.find((r) => r.id === returnId);

  if (existingReturn && !initialized) {
    setYear(existingReturn.year);
    setDeadlineDate(
      existingReturn.deadlineDate
        ? new Date(existingReturn.deadlineDate).toISOString().split("T")[0]
        : ""
    );
    setSelfEvaluation(existingReturn.selfEvaluation ?? "");
    setComplaintsSummary(existingReturn.complaintsSummary ?? "");
    setIncidentsSummary(existingReturn.incidentsSummary ?? "");
    setImprovementsMade(existingReturn.improvementsMade ?? "");
    setPlannedImprovements(existingReturn.plannedImprovements ?? "");
    setServiceUserCount(existingReturn.serviceUserCount ?? undefined);
    setStaffCount(existingReturn.staffCount ?? undefined);
    setStatus(existingReturn.status);
    setSubmissionDate(
      existingReturn.submissionDate
        ? new Date(existingReturn.submissionDate).toISOString().split("T")[0]
        : ""
    );
    setInitialized(true);
  }

  const { refetch: fetchAutoPopulate, isFetching: isAutoPopulating } =
    trpc.compliance.annualReturns.autoPopulate.useQuery(
      { year },
      { enabled: false }
    );

  const createMut = trpc.compliance.annualReturns.create.useMutation({
    onSuccess: () => {
      toast.success("Annual return created");
      utils.compliance.annualReturns.invalidate();
      router.push("/compliance?tab=annual-returns");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMut = trpc.compliance.annualReturns.update.useMutation({
    onSuccess: () => {
      toast.success("Annual return updated");
      utils.compliance.annualReturns.invalidate();
      router.push("/compliance?tab=annual-returns");
    },
    onError: (err) => toast.error(err.message),
  });

  async function handleAutoPopulate() {
    const result = await fetchAutoPopulate();
    if (result.data) {
      setServiceUserCount(result.data.serviceUserCount);
      setStaffCount(result.data.staffCount);
      setComplaintsSummary(result.data.complaintsSummary);
      setIncidentsSummary(result.data.incidentsSummary);
      toast.success("Data populated from live records");
    }
  }

  function handleSubmit() {
    if (returnId) {
      updateMut.mutate({
        id: returnId,
        selfEvaluation: selfEvaluation || undefined,
        complaintsSummary: complaintsSummary || undefined,
        incidentsSummary: incidentsSummary || undefined,
        improvementsMade: improvementsMade || undefined,
        plannedImprovements: plannedImprovements || undefined,
        serviceUserCount,
        staffCount,
        status: status as never,
        submissionDate: submissionDate || undefined,
      });
    } else {
      createMut.mutate({
        year,
        deadlineDate: deadlineDate || undefined,
        selfEvaluation: selfEvaluation || undefined,
        complaintsSummary: complaintsSummary || undefined,
        incidentsSummary: incidentsSummary || undefined,
        improvementsMade: improvementsMade || undefined,
        plannedImprovements: plannedImprovements || undefined,
      });
    }
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Year</label>
          <Input
            type="number"
            className="mt-1"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            min={2020}
            max={2100}
            disabled={!!returnId}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Deadline Date</label>
          <Input
            type="date"
            className="mt-1"
            value={deadlineDate}
            onChange={(e) => setDeadlineDate(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleAutoPopulate}
            disabled={isAutoPopulating}
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isAutoPopulating ? "Populating…" : "Auto-Populate from Live Data"}
          </Button>
        </div>
      </div>

      {/* Auto-populated counts */}
      {(serviceUserCount !== undefined || staffCount !== undefined) && (
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{serviceUserCount ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  Active Service Users
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{staffCount ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Active Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <label className="text-sm font-medium">Self-Evaluation</label>
        <Textarea
          className="mt-1"
          rows={5}
          value={selfEvaluation}
          onChange={(e) => setSelfEvaluation(e.target.value)}
          placeholder="Self-evaluation narrative…"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Complaints Summary</label>
          <Textarea
            className="mt-1"
            rows={3}
            value={complaintsSummary}
            onChange={(e) => setComplaintsSummary(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Incidents Summary</label>
          <Textarea
            className="mt-1"
            rows={3}
            value={incidentsSummary}
            onChange={(e) => setIncidentsSummary(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Improvements Made</label>
          <Textarea
            className="mt-1"
            rows={3}
            value={improvementsMade}
            onChange={(e) => setImprovementsMade(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Planned Improvements</label>
          <Textarea
            className="mt-1"
            rows={3}
            value={plannedImprovements}
            onChange={(e) => setPlannedImprovements(e.target.value)}
          />
        </div>
      </div>

      {returnId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {status === "SUBMITTED" && (
            <div>
              <label className="text-sm font-medium">Submission Date</label>
              <Input
                type="date"
                className="mt-1"
                value={submissionDate}
                onChange={(e) => setSubmissionDate(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending
            ? "Saving…"
            : returnId
              ? "Update Return"
              : "Create Annual Return"}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/compliance?tab=annual-returns")}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

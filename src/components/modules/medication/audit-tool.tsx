"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Checklist definition ────────────────────────────────────────────────────

export const AUDIT_CHECKLIST = [
  {
    section: "MAR (Medication Administration Record)",
    items: [
      "MAR chart is current, up to date and free from gaps",
      "All medications on MAR match current prescriptions",
      "All administered doses recorded with correct dose, route and time",
      "Staff signatures/initials present for all administration entries",
      "Omissions and refusals are clearly documented with reasons",
    ],
  },
  {
    section: "Storage",
    items: [
      "All medications stored in a locked, secure location",
      "Refrigerated medications stored at correct temperature (2–8°C)",
      "Medications stored separately from food and non-pharmaceutical items",
      "No expired medications present — expiry dates checked",
      "Original packaging and labels are intact and legible",
    ],
  },
  {
    section: "PRN Protocols",
    items: [
      "Written PRN protocol in place for each PRN medication",
      "Reason for each PRN administration recorded in MAR",
      "Maximum dose and frequency clearly documented",
      "PRN effectiveness reviewed and outcome recorded",
    ],
  },
  {
    section: "Controlled Drugs",
    items: [
      "Controlled Drug register is up to date and accurate",
      "Witness signatures present for all CD administrations",
      "CD running stock count matches register totals",
      "Destruction records completed and signed where applicable",
      "CD cabinet checks performed as per organisational policy",
    ],
  },
  {
    section: "Competency",
    items: [
      "All staff administering medication have a current signed competency assessment",
      "Competency records held on individual staff files",
      "Any competency concerns have been identified and actioned",
    ],
  },
  {
    section: "Reviews",
    items: [
      "Medication reviews are scheduled as per individual care plans",
      "Annual medication review completed with GP or prescriber",
      "Any changes following medication review are reflected in MAR",
      "Service user (and/or family) involved in medication decisions where appropriate",
    ],
  },
] as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export type Result = "PASS" | "FAIL" | "NA";

export interface FindingItem {
  id: string;
  section: string;
  item: string;
  result: Result;
  notes: string;
}

export interface ActionItem {
  id: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildInitialFindings(): FindingItem[] {
  return AUDIT_CHECKLIST.flatMap(({ section, items }) =>
    items.map((item) => ({
      id: crypto.randomUUID(),
      section,
      item,
      result: "NA" as Result,
      notes: "",
    }))
  );
}

function getSectionSummary(
  findings: FindingItem[],
  section: string
): { pass: number; fail: number; na: number; total: number } {
  const sectionItems = findings.filter((f) => f.section === section);
  return {
    pass: sectionItems.filter((f) => f.result === "PASS").length,
    fail: sectionItems.filter((f) => f.result === "FAIL").length,
    na: sectionItems.filter((f) => f.result === "NA").length,
    total: sectionItems.length,
  };
}

// ─── Result button ────────────────────────────────────────────────────────────

function ResultButton({
  value,
  selected,
  onClick,
}: {
  value: Result;
  selected: boolean;
  onClick: () => void;
}) {
  const config: Record<
    Result,
    { icon: React.ReactNode; label: string; activeClass: string }
  > = {
    PASS: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: "Pass",
      activeClass:
        "bg-green-600 text-white border-green-600 hover:bg-green-700",
    },
    FAIL: {
      icon: <XCircle className="h-4 w-4" />,
      label: "Fail",
      activeClass: "bg-red-600 text-white border-red-600 hover:bg-red-700",
    },
    NA: {
      icon: <MinusCircle className="h-4 w-4" />,
      label: "N/A",
      activeClass:
        "bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30",
    },
  };

  const { icon, label, activeClass } = config[value];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
        selected
          ? activeClass
          : "border-input text-muted-foreground hover:bg-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Section block ────────────────────────────────────────────────────────────

function SectionBlock({
  section,
  findings,
  onResultChange,
  onNotesChange,
}: {
  section: string;
  findings: FindingItem[];
  onResultChange: (id: string, result: Result) => void;
  onNotesChange: (id: string, notes: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const summary = getSectionSummary(findings, section);
  const sectionItems = findings.filter((f) => f.section === section);
  const hasFailures = summary.fail > 0;

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Section header */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-3">
          <span className="font-medium text-sm">{section}</span>
          {hasFailures && (
            <Badge
              variant="destructive"
              className="text-xs"
            >
              {summary.fail} fail{summary.fail !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {summary.pass}P · {summary.fail}F · {summary.na} N/A
          </span>
          {collapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Items */}
      {!collapsed && (
        <div className="divide-y">
          {sectionItems.map((finding) => (
            <div key={finding.id} className="px-4 py-3 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm flex-1">{finding.item}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  {(["PASS", "FAIL", "NA"] as Result[]).map((r) => (
                    <ResultButton
                      key={r}
                      value={r}
                      selected={finding.result === r}
                      onClick={() => onResultChange(finding.id, r)}
                    />
                  ))}
                </div>
              </div>
              {finding.result === "FAIL" && (
                <Input
                  placeholder="Note the issue found…"
                  value={finding.notes}
                  onChange={(e) => onNotesChange(finding.id, e.target.value)}
                  className="text-sm"
                />
              )}
              {finding.result !== "FAIL" && finding.notes && (
                <Input
                  placeholder="Additional notes (optional)…"
                  value={finding.notes}
                  onChange={(e) => onNotesChange(finding.id, e.target.value)}
                  className="text-sm"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Action plan tracker ──────────────────────────────────────────────────────

function ActionPlanTracker({
  actions,
  onChange,
}: {
  actions: ActionItem[];
  onChange: (actions: ActionItem[]) => void;
}) {
  function addAction() {
    onChange([
      ...actions,
      {
        id: crypto.randomUUID(),
        description: "",
        assignedTo: "",
        dueDate: "",
        status: "OPEN",
      },
    ]);
  }

  function removeAction(id: string) {
    onChange(actions.filter((a) => a.id !== id));
  }

  function updateAction(id: string, patch: Partial<ActionItem>) {
    onChange(actions.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  return (
    <div className="space-y-3">
      {actions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No action items added yet.
        </p>
      ) : (
        <div className="space-y-3">
          {actions.map((action, i) => (
            <div
              key={action.id}
              className="rounded-md border p-3 space-y-2 bg-muted/20"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Action {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeAction(action.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <Input
                placeholder="Describe the action required…"
                value={action.description}
                onChange={(e) =>
                  updateAction(action.id, { description: e.target.value })
                }
                className="text-sm"
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Assigned to"
                  value={action.assignedTo}
                  onChange={(e) =>
                    updateAction(action.id, { assignedTo: e.target.value })
                  }
                  className="text-sm"
                />
                <Input
                  type="date"
                  value={action.dueDate}
                  onChange={(e) =>
                    updateAction(action.id, { dueDate: e.target.value })
                  }
                  className="text-sm"
                />
                <Select
                  value={action.status}
                  onValueChange={(v) =>
                    updateAction(action.id, {
                      status: v as ActionItem["status"],
                    })
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="outline" size="sm" onClick={addAction}>
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Action
      </Button>
    </div>
  );
}

// ─── Main audit tool ──────────────────────────────────────────────────────────

interface AuditToolProps {
  /** Provide when editing an existing audit */
  auditId?: string;
  initialFindings?: FindingItem[];
  initialActions?: ActionItem[];
  initialIssues?: string;
  initialStatus?: "OPEN" | "IN_PROGRESS" | "CLOSED";
  onSuccess?: (id: string) => void;
}

export function AuditTool({
  auditId,
  initialFindings,
  initialActions,
  initialIssues,
  initialStatus,
  onSuccess,
}: AuditToolProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [auditDate, setAuditDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [findings, setFindings] = useState<FindingItem[]>(
    initialFindings ?? buildInitialFindings()
  );
  const [actions, setActions] = useState<ActionItem[]>(initialActions ?? []);
  const [issuesIdentified, setIssuesIdentified] = useState(
    initialIssues ?? ""
  );
  const [status, setStatus] = useState<"OPEN" | "IN_PROGRESS" | "CLOSED">(
    initialStatus ?? "OPEN"
  );

  const createMutation = trpc.medication.audits.create.useMutation({
    onSuccess: (data) => {
      toast.success("Audit saved successfully.");
      if (onSuccess) {
        onSuccess(data.id);
      } else {
        router.push("/medication/audits");
      }
    },
    onError: (err) => toast.error(err.message || "Failed to save audit."),
  });

  const updateMutation = trpc.medication.audits.update.useMutation({
    onSuccess: () => {
      toast.success("Audit updated.");
      utils.medication.audits.getById.invalidate({ id: auditId });
      onSuccess?.(auditId!);
    },
    onError: (err) => toast.error(err.message || "Failed to update audit."),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleResultChange = useCallback(
    (id: string, result: Result) => {
      setFindings((prev) =>
        prev.map((f) => (f.id === id ? { ...f, result } : f))
      );
    },
    []
  );

  const handleNotesChange = useCallback((id: string, notes: string) => {
    setFindings((prev) =>
      prev.map((f) => (f.id === id ? { ...f, notes } : f))
    );
  }, []);

  // Summary counts
  const totalPass = findings.filter((f) => f.result === "PASS").length;
  const totalFail = findings.filter((f) => f.result === "FAIL").length;
  const totalNA = findings.filter((f) => f.result === "NA").length;
  const totalAnswered = totalPass + totalFail;
  const score =
    totalAnswered > 0 ? Math.round((totalPass / totalAnswered) * 100) : null;

  function handleSubmit() {
    const payload = {
      auditDate,
      auditFindings: findings,
      issuesIdentified: issuesIdentified || undefined,
      actionsRequired: actions.length > 0 ? actions : undefined,
      status,
    };

    if (auditId) {
      updateMutation.mutate({ id: auditId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="text-sm font-medium block mb-1.5">
            Audit Date
          </label>
          <Input
            type="date"
            value={auditDate}
            onChange={(e) => setAuditDate(e.target.value)}
            className="w-44"
            disabled={!!auditId}
          />
        </div>
        {auditId && (
          <div>
            <label className="text-sm font-medium block mb-1.5">Status</label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as typeof status)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {/* Score summary */}
        {totalAnswered > 0 && (
          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              {totalPass} Pass
            </span>
            <span className="flex items-center gap-1.5 text-red-700 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              {totalFail} Fail
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <MinusCircle className="h-4 w-4" />
              {totalNA} N/A
            </span>
            {score !== null && (
              <Badge
                variant={
                  score >= 80
                    ? "secondary"
                    : score >= 60
                      ? "outline"
                      : "destructive"
                }
                className={`text-sm font-bold ${score >= 80 ? "bg-green-100 text-green-800 border-green-200" : ""}`}
              >
                {score}% compliance
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Checklist sections */}
      <div className="space-y-3">
        {AUDIT_CHECKLIST.map(({ section }) => (
          <SectionBlock
            key={section}
            section={section}
            findings={findings}
            onResultChange={handleResultChange}
            onNotesChange={handleNotesChange}
          />
        ))}
      </div>

      <Separator />

      {/* Issues identified */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Issues Identified</label>
        <Textarea
          placeholder="Summarise any issues identified during the audit…"
          value={issuesIdentified}
          onChange={(e) => setIssuesIdentified(e.target.value)}
          className="min-h-[80px]"
        />
      </div>

      {/* Action plan */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm">Action Plan</h3>
        <ActionPlanTracker actions={actions} onChange={setActions} />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving…" : auditId ? "Save Changes" : "Save Audit"}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

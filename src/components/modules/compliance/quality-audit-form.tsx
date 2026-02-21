"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
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
import {
  QUALITY_AUDIT_TYPE_LABELS,
  type FindingItem,
  type ActionItem,
} from "./compliance-meta";

const AUDIT_CHECKLISTS: Record<string, { section: string; items: string[] }[]> = {
  CARE_PLAN: [
    {
      section: "Care Plan Documentation",
      items: [
        "Care plan reflects current needs",
        "Person-centred language used",
        "Goals and outcomes clearly stated",
        "Signed by service user or representative",
      ],
    },
    {
      section: "Risk Assessments",
      items: [
        "Falls risk assessment completed",
        "Moving & handling assessment current",
        "Nutrition risk assessment completed",
        "Skin integrity assessment completed",
      ],
    },
    {
      section: "Review Schedule",
      items: [
        "6-monthly review completed on time",
        "Changes documented following review",
        "Family/carer involvement documented",
      ],
    },
  ],
  MEDICATION: [
    {
      section: "MAR Charts",
      items: [
        "MAR chart completed accurately",
        "No gaps or omissions",
        "PRN protocols documented",
        "Allergies clearly recorded",
      ],
    },
    {
      section: "Storage & Safety",
      items: [
        "Medication stored securely",
        "Temperature monitoring recorded",
        "Controlled drugs register accurate",
        "Out-of-date medication disposed",
      ],
    },
    {
      section: "Administration Records",
      items: [
        "Staff signatures present",
        "Refusal/omission codes used correctly",
        "Self-administration assessments current",
      ],
    },
  ],
  HEALTH_SAFETY: [
    {
      section: "Risk Assessments",
      items: [
        "Workplace risk assessments current",
        "Lone working procedures in place",
        "Manual handling assessments completed",
      ],
    },
    {
      section: "Fire Safety",
      items: [
        "Fire risk assessment current",
        "Fire drills conducted regularly",
        "Equipment inspected and serviced",
        "Escape routes clear and signed",
      ],
    },
    {
      section: "COSHH",
      items: [
        "COSHH assessments completed",
        "Hazardous substances stored correctly",
        "Data sheets available",
      ],
    },
  ],
  INFECTION_CONTROL: [
    {
      section: "Hand Hygiene",
      items: [
        "Hand washing facilities adequate",
        "Hand hygiene audits conducted",
        "Alcohol gel dispensers available",
      ],
    },
    {
      section: "PPE",
      items: [
        "PPE stock levels adequate",
        "Staff trained in PPE use",
        "PPE disposed of correctly",
      ],
    },
    {
      section: "Cleaning Schedules",
      items: [
        "Cleaning schedules in place",
        "Schedules completed as required",
        "Colour-coded equipment used",
      ],
    },
    {
      section: "Waste Management",
      items: [
        "Clinical waste segregated correctly",
        "Sharps bins not overfilled",
        "Waste collection regular",
      ],
    },
  ],
  STAFF_FILE: [
    {
      section: "Personal Details",
      items: [
        "Application form complete",
        "Proof of identity on file",
        "Right to work documentation verified",
      ],
    },
    {
      section: "Qualifications",
      items: [
        "SVQ/qualification certificates on file",
        "SSSC registration current",
        "Professional references obtained",
      ],
    },
    {
      section: "Training Records",
      items: [
        "Mandatory training completed",
        "Training matrix up to date",
        "Supervision records current",
      ],
    },
    {
      section: "PVG/Disclosure",
      items: [
        "PVG scheme membership confirmed",
        "Disclosure Scotland check on file",
        "Renewal dates monitored",
      ],
    },
  ],
  RECORD_KEEPING: [
    {
      section: "Daily Records",
      items: [
        "Daily notes completed for each visit",
        "Records are legible and factual",
        "Outcomes of care documented",
      ],
    },
    {
      section: "Handover Notes",
      items: [
        "Handover completed at each shift change",
        "Key information communicated",
        "Actions followed up",
      ],
    },
    {
      section: "Incident Records",
      items: [
        "Incidents recorded promptly",
        "Investigation notes completed",
        "Lessons learned documented",
      ],
    },
  ],
};

const TYPES = Object.entries(QUALITY_AUDIT_TYPE_LABELS);

export function QualityAuditForm({ auditId }: { auditId?: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [auditType, setAuditType] = useState("");
  const [auditDate, setAuditDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [findings, setFindings] = useState<FindingItem[]>([]);
  const [issues, setIssues] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [actionPlan, setActionPlan] = useState<ActionItem[]>([]);
  const [followUpDate, setFollowUpDate] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Load existing audit for edit mode
  const { data: existing } = trpc.compliance.audits.getById.useQuery(
    { id: auditId! },
    { enabled: !!auditId }
  );

  if (existing && !initialized) {
    setAuditType(existing.auditType);
    setAuditDate(new Date(existing.auditDate).toISOString().split("T")[0]);
    setFindings(
      (existing.findings as unknown as FindingItem[]) ?? []
    );
    setIssues(existing.issues ?? "");
    setRecommendations(existing.recommendations ?? "");
    setActionPlan(
      (existing.actionPlan as unknown as ActionItem[]) ?? []
    );
    setFollowUpDate(
      existing.followUpDate
        ? new Date(existing.followUpDate).toISOString().split("T")[0]
        : ""
    );
    setInitialized(true);
  }

  const createMut = trpc.compliance.audits.create.useMutation({
    onSuccess: () => {
      toast.success("Audit created");
      utils.compliance.audits.invalidate();
      router.push("/compliance?tab=audits");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMut = trpc.compliance.audits.update.useMutation({
    onSuccess: () => {
      toast.success("Audit updated");
      utils.compliance.audits.invalidate();
      router.push("/compliance?tab=audits");
    },
    onError: (err) => toast.error(err.message),
  });

  // Initialize checklist when type changes
  function initChecklist(type: string) {
    const sections = AUDIT_CHECKLISTS[type];
    if (!sections) return;
    const newFindings: FindingItem[] = [];
    for (const section of sections) {
      for (const item of section.items) {
        newFindings.push({
          id: crypto.randomUUID(),
          section: section.section,
          item,
          result: "PASS",
        });
      }
    }
    setFindings(newFindings);
  }

  function setFindingResult(id: string, result: FindingItem["result"]) {
    setFindings((prev) =>
      prev.map((f) => (f.id === id ? { ...f, result } : f))
    );
  }

  function setFindingNotes(id: string, notes: string) {
    setFindings((prev) =>
      prev.map((f) => (f.id === id ? { ...f, notes } : f))
    );
  }

  function addAction() {
    setActionPlan((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        description: "",
        status: "OPEN",
      },
    ]);
  }

  function removeAction(id: string) {
    setActionPlan((prev) => prev.filter((a) => a.id !== id));
  }

  function handleSubmit() {
    if (!auditType || !auditDate) {
      toast.error("Audit type and date are required");
      return;
    }

    const payload = {
      auditType: auditType as never,
      auditDate,
      findings: findings.length > 0 ? findings : undefined,
      issues: issues || undefined,
      recommendations: recommendations || undefined,
      actionPlan: actionPlan.length > 0 ? actionPlan : undefined,
      followUpDate: followUpDate || undefined,
    };

    if (auditId) {
      updateMut.mutate({ id: auditId, ...payload });
    } else {
      createMut.mutate(payload);
    }
  }

  const isPending = createMut.isPending || updateMut.isPending;

  // Group findings by section
  const sections = new Map<string, FindingItem[]>();
  for (const f of findings) {
    if (!sections.has(f.section)) sections.set(f.section, []);
    sections.get(f.section)!.push(f);
  }

  return (
    <div className="space-y-6">
      {/* Type & Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Audit Type</label>
          <Select
            value={auditType}
            onValueChange={(v) => {
              setAuditType(v);
              if (!auditId) initChecklist(v);
            }}
            disabled={!!auditId}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Audit Date</label>
          <Input
            type="date"
            className="mt-1"
            value={auditDate}
            onChange={(e) => setAuditDate(e.target.value)}
          />
        </div>
      </div>

      {/* Checklist */}
      {sections.size > 0 && (
        <div className="space-y-4">
          {[...sections.entries()].map(([section, items]) => (
            <Card key={section}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{section}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((f) => (
                  <div key={f.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm">{f.item}</span>
                      <div className="flex gap-1 shrink-0">
                        {(["PASS", "FAIL", "NA"] as const).map((r) => (
                          <Button
                            key={r}
                            type="button"
                            size="sm"
                            variant={f.result === r ? "default" : "outline"}
                            className={`h-7 px-2 text-xs ${
                              f.result === r && r === "PASS"
                                ? "bg-green-600 hover:bg-green-700"
                                : f.result === r && r === "FAIL"
                                  ? "bg-red-600 hover:bg-red-700"
                                  : ""
                            }`}
                            onClick={() => setFindingResult(f.id, r)}
                          >
                            {r === "NA" ? "N/A" : r}
                          </Button>
                        ))}
                      </div>
                    </div>
                    {f.result === "FAIL" && (
                      <Input
                        placeholder="Notes…"
                        value={f.notes ?? ""}
                        onChange={(e) => setFindingNotes(f.id, e.target.value)}
                        className="text-sm h-8"
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Issues & Recommendations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Issues Found</label>
          <Textarea
            className="mt-1"
            rows={3}
            value={issues}
            onChange={(e) => setIssues(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Recommendations</label>
          <Textarea
            className="mt-1"
            rows={3}
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
          />
        </div>
      </div>

      {/* Action Plan */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Action Plan</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={addAction}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Action
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {actionPlan.length === 0 && (
            <p className="text-sm text-muted-foreground">No actions added.</p>
          )}
          {actionPlan.map((a) => (
            <div key={a.id} className="flex items-start gap-2">
              <Input
                placeholder="Action description"
                value={a.description}
                onChange={(e) =>
                  setActionPlan((prev) =>
                    prev.map((x) =>
                      x.id === a.id ? { ...x, description: e.target.value } : x
                    )
                  )
                }
                className="flex-1"
              />
              <Input
                type="date"
                placeholder="Due"
                value={a.dueDate ?? ""}
                onChange={(e) =>
                  setActionPlan((prev) =>
                    prev.map((x) =>
                      x.id === a.id ? { ...x, dueDate: e.target.value } : x
                    )
                  )
                }
                className="w-[150px]"
              />
              <Select
                value={a.status}
                onValueChange={(v) =>
                  setActionPlan((prev) =>
                    prev.map((x) =>
                      x.id === a.id
                        ? { ...x, status: v as ActionItem["status"] }
                        : x
                    )
                  )
                }
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeAction(a.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Follow-up */}
      <div className="w-48">
        <label className="text-sm font-medium">Follow-up Date</label>
        <Input
          type="date"
          className="mt-1"
          value={followUpDate}
          onChange={(e) => setFollowUpDate(e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving…" : auditId ? "Update Audit" : "Create Audit"}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/compliance?tab=audits")}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

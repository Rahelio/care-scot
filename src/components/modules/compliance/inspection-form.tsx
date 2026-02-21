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
  CI_GRADE_AREAS,
  GRADE_LABELS,
  gradeColor,
  type RequirementItem,
} from "./compliance-meta";

const GRADE_KEYS = Object.entries(CI_GRADE_AREAS);

export function InspectionForm({ inspectionId }: { inspectionId?: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [inspectionDate, setInspectionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [inspectorName, setInspectorName] = useState("");
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [reportSummary, setReportSummary] = useState("");
  const [requirements, setRequirements] = useState<RequirementItem[]>([]);
  const [recommendations, setRecommendations] = useState<RequirementItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  const { data: existing } = trpc.compliance.inspections.getById.useQuery(
    { id: inspectionId! },
    { enabled: !!inspectionId }
  );

  if (existing && !initialized) {
    setInspectionDate(
      new Date(existing.inspectionDate).toISOString().split("T")[0]
    );
    setInspectorName(existing.inspectorName ?? "");
    setGrades((existing.grades as Record<string, number>) ?? {});
    setReportSummary(existing.reportSummary ?? "");
    setRequirements(
      (existing.requirements as unknown as RequirementItem[]) ?? []
    );
    setRecommendations(
      (existing.recommendations as unknown as RequirementItem[]) ?? []
    );
    setInitialized(true);
  }

  const createMut = trpc.compliance.inspections.create.useMutation({
    onSuccess: () => {
      toast.success("Inspection recorded");
      utils.compliance.inspections.invalidate();
      router.push("/compliance?tab=inspections");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMut = trpc.compliance.inspections.update.useMutation({
    onSuccess: () => {
      toast.success("Inspection updated");
      utils.compliance.inspections.invalidate();
      router.push("/compliance?tab=inspections");
    },
    onError: (err) => toast.error(err.message),
  });

  function addRequirement(list: "requirements" | "recommendations") {
    const item: RequirementItem = {
      id: crypto.randomUUID(),
      description: "",
      status: "OPEN",
    };
    if (list === "requirements") {
      setRequirements((prev) => [...prev, item]);
    } else {
      setRecommendations((prev) => [...prev, item]);
    }
  }

  function updateItem(
    list: "requirements" | "recommendations",
    id: string,
    updates: Partial<RequirementItem>
  ) {
    const setter =
      list === "requirements" ? setRequirements : setRecommendations;
    setter((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  }

  function removeItem(list: "requirements" | "recommendations", id: string) {
    const setter =
      list === "requirements" ? setRequirements : setRecommendations;
    setter((prev) => prev.filter((r) => r.id !== id));
  }

  function handleSubmit() {
    if (!inspectionDate) {
      toast.error("Inspection date is required");
      return;
    }

    const payload = {
      inspectionDate,
      inspectorName: inspectorName || undefined,
      grades: Object.keys(grades).length > 0 ? grades : undefined,
      reportSummary: reportSummary || undefined,
      requirements: requirements.length > 0 ? requirements : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    };

    if (inspectionId) {
      updateMut.mutate({ id: inspectionId, ...payload });
    } else {
      createMut.mutate(payload);
    }
  }

  const isPending = createMut.isPending || updateMut.isPending;

  function renderItemList(
    list: "requirements" | "recommendations",
    items: RequirementItem[],
    title: string
  ) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{title}</CardTitle>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addRequirement(list)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">None added.</p>
          )}
          {items.map((item) => (
            <div key={item.id} className="space-y-2 border-b pb-3 last:border-0">
              <div className="flex items-start gap-2">
                <Textarea
                  placeholder="Description"
                  rows={2}
                  value={item.description}
                  onChange={(e) =>
                    updateItem(list, item.id, {
                      description: e.target.value,
                    })
                  }
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeItem(list, item.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Select
                  value={item.status}
                  onValueChange={(v) =>
                    updateItem(list, item.id, {
                      status: v as RequirementItem["status"],
                    })
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
                <Input
                  type="date"
                  placeholder="Due date"
                  value={item.dueDate ?? ""}
                  onChange={(e) =>
                    updateItem(list, item.id, { dueDate: e.target.value })
                  }
                  className="w-[150px]"
                />
                <Input
                  placeholder="Notes"
                  value={item.notes ?? ""}
                  onChange={(e) =>
                    updateItem(list, item.id, { notes: e.target.value })
                  }
                  className="flex-1"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Inspection Date</label>
          <Input
            type="date"
            className="mt-1"
            value={inspectionDate}
            onChange={(e) => setInspectionDate(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Inspector Name</label>
          <Input
            className="mt-1"
            value={inspectorName}
            onChange={(e) => setInspectorName(e.target.value)}
            placeholder="Name of inspector"
          />
        </div>
      </div>

      {/* Grades */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Quality Grades (1–6 scale)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {GRADE_KEYS.map(([key, desc]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-sm flex-1 min-w-0">{desc}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6].map((g) => (
                  <Button
                    key={g}
                    type="button"
                    size="sm"
                    variant={grades[key] === g ? "default" : "outline"}
                    className={`h-8 w-8 p-0 text-xs ${
                      grades[key] === g ? gradeColor(g) : ""
                    }`}
                    onClick={() =>
                      setGrades((prev) => ({ ...prev, [key]: g }))
                    }
                    title={GRADE_LABELS[g]}
                  >
                    {g}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div>
        <label className="text-sm font-medium">Report Summary</label>
        <Textarea
          className="mt-1"
          rows={4}
          value={reportSummary}
          onChange={(e) => setReportSummary(e.target.value)}
          placeholder="Summary of inspection findings…"
        />
      </div>

      {renderItemList("requirements", requirements, "Requirements")}
      {renderItemList("recommendations", recommendations, "Recommendations")}

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending
            ? "Saving…"
            : inspectionId
              ? "Update Inspection"
              : "Record Inspection"}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/compliance?tab=inspections")}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

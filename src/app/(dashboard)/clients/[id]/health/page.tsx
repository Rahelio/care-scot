"use client";

import { use, useState } from "react";
import { Plus, AlertTriangle, Activity, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HealthRecordForm } from "@/components/modules/clients/health-record-form";
import { formatDate } from "@/lib/utils";
import type { HealthRecord } from "@prisma/client";

const RECORD_TYPE_LABELS: Record<string, string> = {
  MEDICAL_HISTORY: "Medical History",
  DIAGNOSIS: "Diagnosis",
  ALLERGY: "Allergy",
  GP_VISIT: "GP Visit",
  HOSPITAL_ADMISSION: "Hospital Admission",
  HOSPITAL_DISCHARGE: "Hospital Discharge",
  HEALTHCARE_VISIT: "Healthcare Visit",
  CONDITION_CHANGE: "Condition Change",
};

const SEVERITY_COLORS: Record<string, string> = {
  MILD: "bg-yellow-100 text-yellow-800 border-yellow-200",
  MODERATE: "bg-orange-100 text-orange-800 border-orange-200",
  SEVERE: "bg-red-100 text-red-800 border-red-200",
  LIFE_THREATENING: "bg-red-200 text-red-900 border-red-300",
};

const SEVERITY_LABELS: Record<string, string> = {
  MILD: "Mild",
  MODERATE: "Moderate",
  SEVERE: "Severe",
  LIFE_THREATENING: "Life Threatening",
};

const TYPE_FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "ALLERGY", label: "Allergies" },
  { value: "DIAGNOSIS", label: "Diagnoses" },
  { value: "GP_VISIT", label: "GP Visits" },
  { value: "HOSPITAL_ADMISSION", label: "Admissions" },
  { value: "HOSPITAL_DISCHARGE", label: "Discharges" },
  { value: "HEALTHCARE_VISIT", label: "Healthcare" },
  { value: "CONDITION_CHANGE", label: "Condition Changes" },
  { value: "MEDICAL_HISTORY", label: "History" },
];

export default function HealthPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialRecordType, setInitialRecordType] = useState<string | undefined>();
  const [editRecord, setEditRecord] = useState<HealthRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const utils = trpc.useUtils();

  const { data: allRecords, isPending } = trpc.clients.listHealthRecords.useQuery({
    serviceUserId: id,
  });

  const deleteMut = trpc.clients.deleteHealthRecord.useMutation({
    onSuccess: () => {
      toast.success("Health record deleted");
      utils.clients.listHealthRecords.invalidate({ serviceUserId: id });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.message),
  });

  if (isPending) {
    return <div className="py-8 text-center text-muted-foreground">Loading…</div>;
  }

  const allergies = (allRecords ?? []).filter((r) => r.recordType === "ALLERGY");
  const conditions = (allRecords ?? []).filter((r) => r.recordType === "DIAGNOSIS");
  const timeline = typeFilter
    ? (allRecords ?? []).filter((r) => r.recordType === typeFilter)
    : (allRecords ?? []);

  function openForm(type?: string) {
    setEditRecord(null);
    setInitialRecordType(type);
    setDialogOpen(true);
  }

  function openEdit(record: HealthRecord) {
    setInitialRecordType(undefined);
    setEditRecord(record);
    setDialogOpen(true);
  }

  function openDelete(record: { id: string; title: string }) {
    setDeleteTarget(record);
    setDeleteDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Health Records</h2>
        <Button onClick={() => openForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Record
        </Button>
      </div>

      {/* Allergies */}
      <Card className="border-red-200 bg-red-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-900">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Allergies
              {allergies.length > 0 && (
                <Badge className="bg-red-100 text-red-800 border-red-200 ml-1">
                  {allergies.length}
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-700 hover:text-red-900 hover:bg-red-100"
              onClick={() => openForm("ALLERGY")}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {allergies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No allergies recorded.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allergies.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-1.5 bg-white border border-red-200 rounded-full px-3 py-1"
                >
                  <span className="text-sm font-medium">{a.title}</span>
                  {a.severity && (
                    <Badge
                      variant="outline"
                      className={`text-xs ${SEVERITY_COLORS[a.severity] ?? ""}`}
                    >
                      {SEVERITY_LABELS[a.severity] ?? a.severity}
                    </Badge>
                  )}
                  <button
                    onClick={() => openEdit(a)}
                    className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => openDelete({ id: a.id, title: a.title })}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Conditions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              Current Conditions
              {conditions.length > 0 && (
                <Badge variant="outline" className="ml-1">
                  {conditions.length}
                </Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => openForm("DIAGNOSIS")}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {conditions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conditions recorded.</p>
          ) : (
            <div className="divide-y">
              {conditions.map((c) => (
                <div key={c.id} className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{c.title}</span>
                      {c.severity && (
                        <Badge
                          variant="outline"
                          className={`text-xs ${SEVERITY_COLORS[c.severity] ?? ""}`}
                        >
                          {SEVERITY_LABELS[c.severity] ?? c.severity}
                        </Badge>
                      )}
                    </div>
                    {c.description && (
                      <p className="text-xs text-muted-foreground">{c.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(c.recordedDate)}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(c)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => openDelete({ id: c.id, title: c.title })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <div>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h3 className="text-sm font-semibold">Health Timeline</h3>
          <div className="flex flex-wrap gap-1">
            {TYPE_FILTER_OPTIONS.map(({ value, label }) => (
              <Button
                key={value}
                variant={typeFilter === value ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setTypeFilter(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {timeline.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground mb-4">
                {typeFilter
                  ? `No ${RECORD_TYPE_LABELS[typeFilter] ?? typeFilter} records.`
                  : "No health records yet."}
              </p>
              <Button variant="outline" onClick={() => openForm()}>
                Add First Record
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {timeline.map((record) => (
              <Card key={record.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{record.title}</p>
                        <Badge variant="outline" className="text-xs">
                          {RECORD_TYPE_LABELS[record.recordType] ?? record.recordType}
                        </Badge>
                        {record.severity && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${SEVERITY_COLORS[record.severity] ?? ""}`}
                          >
                            {SEVERITY_LABELS[record.severity] ?? record.severity}
                          </Badge>
                        )}
                      </div>
                      {record.description && (
                        <p className="text-sm text-muted-foreground">{record.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(record.recordedDate)}
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(record)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => openDelete({ id: record.id, title: record.title })}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <HealthRecordForm
        serviceUserId={id}
        initialRecordType={initialRecordType}
        record={editRecord ?? undefined}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditRecord(null);
        }}
        onSuccess={() => utils.clients.listHealthRecords.invalidate({ serviceUserId: id })}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Health Record</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <strong className="text-foreground">{deleteTarget?.title}</strong>? This cannot be
            undone.
          </p>
          <div className="flex justify-end gap-3 mt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteMut.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => deleteTarget && deleteMut.mutate({ id: deleteTarget.id })}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

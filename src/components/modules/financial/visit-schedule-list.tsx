"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Clock, Users } from "lucide-react";
import { toast } from "sonner";

const DAYS_OF_WEEK = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
] as const;

const DAY_ORDER: Record<string, number> = {
  MONDAY: 0,
  TUESDAY: 1,
  WEDNESDAY: 2,
  THURSDAY: 3,
  FRIDAY: 4,
  SATURDAY: 5,
  SUNDAY: 6,
};

const fmtDate = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

interface Props {
  carePackageId: string;
  packageName: string;
  funderName: string;
  packageStatus: string;
}

type ScheduleRow = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  carersRequired: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  notes: string | null;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  ON_HOLD: "secondary",
  ENDED: "outline",
};

function emptyForm() {
  return {
    dayOfWeek: "",
    startTime: "",
    endTime: "",
    carersRequired: "1",
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveTo: "",
    notes: "",
  };
}

export function VisitScheduleList({
  carePackageId,
  packageName,
  funderName,
  packageStatus,
}: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const utils = trpc.useUtils();

  const { data: schedules = [], isLoading } =
    trpc.financial.visitSchedules.listByPackage.useQuery({ carePackageId });

  const createMut = trpc.financial.visitSchedules.create.useMutation({
    onSuccess: () => {
      utils.financial.visitSchedules.invalidate();
      closeForm();
      toast.success("Visit slot added");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = trpc.financial.visitSchedules.update.useMutation({
    onSuccess: () => {
      utils.financial.visitSchedules.invalidate();
      closeForm();
      toast.success("Visit slot updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.financial.visitSchedules.delete.useMutation({
    onSuccess: () => {
      utils.financial.visitSchedules.invalidate();
      toast.success("Visit slot removed");
    },
    onError: (e) => toast.error(e.message),
  });

  function closeForm() {
    setFormOpen(false);
    setEditId(null);
    setForm(emptyForm());
  }

  function openEdit(row: ScheduleRow) {
    setEditId(row.id);
    setForm({
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
      endTime: row.endTime,
      carersRequired: String(row.carersRequired),
      effectiveFrom: new Date(row.effectiveFrom).toISOString().split("T")[0],
      effectiveTo: row.effectiveTo
        ? new Date(row.effectiveTo).toISOString().split("T")[0]
        : "",
      notes: row.notes ?? "",
    });
    setFormOpen(true);
  }

  function handleSubmit() {
    const payload = {
      carePackageId,
      dayOfWeek: form.dayOfWeek as
        | "MONDAY"
        | "TUESDAY"
        | "WEDNESDAY"
        | "THURSDAY"
        | "FRIDAY"
        | "SATURDAY"
        | "SUNDAY",
      startTime: form.startTime,
      endTime: form.endTime,
      carersRequired: parseInt(form.carersRequired),
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || null,
      notes: form.notes || undefined,
    };

    if (editId) {
      updateMut.mutate({ id: editId, ...payload });
    } else {
      createMut.mutate(payload);
    }
  }

  const isValid =
    form.dayOfWeek &&
    form.startTime &&
    form.endTime &&
    form.effectiveFrom &&
    parseInt(form.carersRequired) >= 1;

  // Group schedules by day of week for display
  const byDay = [...schedules].sort(
    (a, b) =>
      (DAY_ORDER[a.dayOfWeek] ?? 0) - (DAY_ORDER[b.dayOfWeek] ?? 0) ||
      a.startTime.localeCompare(b.startTime),
  );

  const grouped = byDay.reduce<Record<string, typeof schedules>>((acc, s) => {
    (acc[s.dayOfWeek] ??= []).push(s);
    return acc;
  }, {});

  const isEnded = packageStatus === "ENDED";

  return (
    <div>
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">
                {packageName}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {funderName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_VARIANT[packageStatus] ?? "outline"}>
                {packageStatus}
              </Badge>
              {!isEnded && (
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add slot
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Loading schedule...
            </p>
          ) : schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No visits scheduled. Add a slot to define this client&apos;s care
              routine.
            </p>
          ) : (
            <div className="space-y-3">
              {DAYS_OF_WEEK.filter((d) => grouped[d.value]).map((d) => (
                <div key={d.value}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    {d.label}
                  </p>
                  <div className="space-y-1">
                    {grouped[d.value].map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5 font-medium tabular-nums">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {slot.startTime}–{slot.endTime}
                          </span>
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            {slot.carersRequired}{" "}
                            {slot.carersRequired === 1 ? "carer" : "carers"}
                          </span>
                          {slot.effectiveTo && (
                            <span className="text-xs text-muted-foreground">
                              until{" "}
                              {fmtDate.format(new Date(slot.effectiveTo))}
                            </span>
                          )}
                          {slot.notes && (
                            <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">
                              {slot.notes}
                            </span>
                          )}
                        </div>
                        {!isEnded && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(slot as ScheduleRow)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => deleteMut.mutate({ id: slot.id })}
                              disabled={deleteMut.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={() => closeForm()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit visit slot" : "Add visit slot"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Day of week</Label>
              <Select
                value={form.dayOfWeek}
                onValueChange={(v) => setForm((f) => ({ ...f, dayOfWeek: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start time</Label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startTime: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>End time</Label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endTime: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <Label>Carers required</Label>
              <Input
                type="number"
                min="1"
                value={form.carersRequired}
                onChange={(e) =>
                  setForm((f) => ({ ...f, carersRequired: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Effective from</Label>
                <Input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, effectiveFrom: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Effective to</Label>
                <Input
                  type="date"
                  value={form.effectiveTo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, effectiveTo: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
                placeholder="Optional notes about this visit slot"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            <Button
              disabled={
                !isValid || createMut.isPending || updateMut.isPending
              }
              onClick={handleSubmit}
            >
              {editId ? "Update" : "Add slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

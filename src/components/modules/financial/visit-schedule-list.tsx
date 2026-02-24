"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Clock, Users, CalendarX2 } from "lucide-react";
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
  MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3,
  FRIDAY: 4, SATURDAY: 5, SUNDAY: 6,
};

const fmtDate = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit", month: "2-digit", year: "numeric",
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
    days: [] as string[],
    startTime: "",
    endTime: "",
    carersRequired: "1",
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveTo: "",
    notes: "",
  };
}

function emptyBulkForm() {
  return { startTime: "", endTime: "", carersRequired: "", effectiveFrom: "", effectiveTo: "" };
}

type DayOfWeekValue = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export function VisitScheduleList({
  carePackageId,
  packageName,
  funderName,
  packageStatus,
}: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState(emptyBulkForm());
  const [bulkEndOpen, setBulkEndOpen] = useState(false);
  const [bulkEndDate, setBulkEndDate] = useState("");

  const utils = trpc.useUtils();

  const { data: schedules = [], isLoading } =
    trpc.financial.visitSchedules.listByPackage.useQuery({ carePackageId });

  const createMut = trpc.financial.visitSchedules.create.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const updateMut = trpc.financial.visitSchedules.update.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.financial.visitSchedules.delete.useMutation({
    onSuccess: () => {
      utils.financial.visitSchedules.invalidate();
      toast.success("Visit slot removed");
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Single-slot form helpers ───────────────────────────────

  function closeForm() {
    setFormOpen(false);
    setEditId(null);
    setForm(emptyForm());
  }

  function openEdit(row: ScheduleRow) {
    setEditId(row.id);
    setForm({
      days: [row.dayOfWeek],
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

  function toggleDay(day: string) {
    setForm((f) => ({
      ...f,
      days: editId
        ? [day]
        : f.days.includes(day)
          ? f.days.filter((d) => d !== day)
          : [...f.days, day],
    }));
  }

  async function handleSubmit() {
    const base = {
      carePackageId,
      startTime: form.startTime,
      endTime: form.endTime,
      carersRequired: parseInt(form.carersRequired),
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || null,
      notes: form.notes || undefined,
    };

    try {
      if (editId) {
        await updateMut.mutateAsync({
          id: editId,
          dayOfWeek: form.days[0] as DayOfWeekValue,
          ...base,
        });
        utils.financial.visitSchedules.invalidate();
        closeForm();
        toast.success("Visit slot updated");
      } else {
        await Promise.all(
          form.days.map((day) =>
            createMut.mutateAsync({ ...base, dayOfWeek: day as DayOfWeekValue }),
          ),
        );
        utils.financial.visitSchedules.invalidate();
        closeForm();
        toast.success(
          form.days.length > 1
            ? `${form.days.length} visit slots added`
            : "Visit slot added",
        );
      }
    } catch {
      // onError callbacks handle the toast
    }
  }

  // ── Bulk selection helpers ─────────────────────────────────

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(
      selectedIds.size === schedules.length
        ? new Set()
        : new Set(schedules.map((s) => s.id)),
    );
  }

  function toggleSelectDay(daySlots: typeof schedules) {
    const ids = daySlots.map((s) => s.id);
    const allDaySelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allDaySelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  // ── Bulk action handlers ───────────────────────────────────

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) => deleteMut.mutateAsync({ id })));
      utils.financial.visitSchedules.invalidate();
      setSelectedIds(new Set());
      toast.success(`${ids.length} slot${ids.length !== 1 ? "s" : ""} removed`);
    } catch {
      // onError callbacks handle the toast
    }
  }

  async function handleBulkEnd() {
    const ids = [...selectedIds];
    try {
      await Promise.all(
        ids.map((id) => updateMut.mutateAsync({ id, effectiveTo: bulkEndDate })),
      );
      utils.financial.visitSchedules.invalidate();
      setSelectedIds(new Set());
      setBulkEndOpen(false);
      setBulkEndDate("");
      toast.success(`${ids.length} slot${ids.length !== 1 ? "s" : ""} ended`);
    } catch {
      // onError callbacks handle the toast
    }
  }

  async function handleBulkEdit() {
    const ids = [...selectedIds];
    // Only include fields the user actually filled in
    const changes: Record<string, unknown> = {};
    if (bulkForm.startTime) changes.startTime = bulkForm.startTime;
    if (bulkForm.endTime) changes.endTime = bulkForm.endTime;
    if (bulkForm.carersRequired) changes.carersRequired = parseInt(bulkForm.carersRequired);
    if (bulkForm.effectiveFrom) changes.effectiveFrom = bulkForm.effectiveFrom;
    if (bulkForm.effectiveTo) changes.effectiveTo = bulkForm.effectiveTo;

    if (Object.keys(changes).length === 0) {
      toast.error("Fill in at least one field to apply");
      return;
    }

    try {
      await Promise.all(
        ids.map((id) =>
          updateMut.mutateAsync(
            { id, ...changes } as Parameters<typeof updateMut.mutateAsync>[0],
          ),
        ),
      );
      utils.financial.visitSchedules.invalidate();
      setSelectedIds(new Set());
      setBulkEditOpen(false);
      setBulkForm(emptyBulkForm());
      toast.success(`${ids.length} slot${ids.length !== 1 ? "s" : ""} updated`);
    } catch {
      // onError callbacks handle the toast
    }
  }

  // ── Derived display state ──────────────────────────────────

  const isValid =
    form.days.length > 0 &&
    form.startTime &&
    form.endTime &&
    form.effectiveFrom &&
    parseInt(form.carersRequired) >= 1;

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
  const allSelected = schedules.length > 0 && selectedIds.size === schedules.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div>
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">{packageName}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{funderName}</p>
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
              No visits scheduled. Add a slot to define this client&apos;s care routine.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Bulk toolbar */}
              {!isEnded && (
                <div className="flex items-center justify-between pb-2 border-b">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-muted-foreground">
                      {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
                    </span>
                  </label>
                  {selectedIds.size > 0 && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBulkEditOpen(true)}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBulkEndOpen(true)}
                      >
                        <CalendarX2 className="h-3.5 w-3.5 mr-1" />
                        End
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleBulkDelete}
                        disabled={deleteMut.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Slots grouped by day */}
              {DAYS_OF_WEEK.filter((d) => grouped[d.value]).map((d) => {
                const daySlots = grouped[d.value];
                const allDaySelected = daySlots.every((s) => selectedIds.has(s.id));
                const someDaySelected =
                  daySlots.some((s) => selectedIds.has(s.id)) && !allDaySelected;

                return (
                  <div key={d.value}>
                    <div className="flex items-center gap-2 mb-1">
                      {!isEnded && (
                        <Checkbox
                          checked={
                            allDaySelected ? true : someDaySelected ? "indeterminate" : false
                          }
                          onCheckedChange={() => toggleSelectDay(daySlots)}
                        />
                      )}
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {d.label}
                      </p>
                    </div>
                    <div className="space-y-1">
                      {daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className={cn(
                            "flex items-center justify-between rounded-md border px-3 py-2 text-sm",
                            selectedIds.has(slot.id) && "bg-muted/50 border-primary/30",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {!isEnded && (
                              <Checkbox
                                checked={selectedIds.has(slot.id)}
                                onCheckedChange={() => toggleSelect(slot.id)}
                              />
                            )}
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
                                until {fmtDate.format(new Date(slot.effectiveTo))}
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Single-slot add / edit dialog ── */}
      <Dialog open={formOpen} onOpenChange={() => closeForm()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit visit slot" : "Add visit slot"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">
                {editId ? "Day of week" : "Days of week"}
              </Label>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {DAYS_OF_WEEK.map((d) => (
                  <label
                    key={d.value}
                    className={cn(
                      "flex items-center gap-2 cursor-pointer select-none rounded px-1 py-0.5",
                      "hover:bg-muted/60 transition-colors",
                    )}
                  >
                    <Checkbox
                      checked={form.days.includes(d.value)}
                      onCheckedChange={() => toggleDay(d.value)}
                    />
                    <span className="text-sm">{d.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start time</Label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </div>
              <div>
                <Label>End time</Label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Carers required</Label>
              <Input
                type="number"
                min="1"
                value={form.carersRequired}
                onChange={(e) => setForm((f) => ({ ...f, carersRequired: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Effective from</Label>
                <Input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
                />
              </div>
              <div>
                <Label>Effective to</Label>
                <Input
                  type="date"
                  value={form.effectiveTo}
                  onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Optional notes about this visit slot"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button
              disabled={!isValid || createMut.isPending || updateMut.isPending}
              onClick={handleSubmit}
            >
              {editId ? "Update" : "Add slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk edit dialog ── */}
      <Dialog
        open={bulkEditOpen}
        onOpenChange={() => { setBulkEditOpen(false); setBulkForm(emptyBulkForm()); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit {selectedIds.size} slot{selectedIds.size !== 1 ? "s" : ""}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Leave a field blank to keep each slot&apos;s existing value.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start time</Label>
                <Input
                  type="time"
                  value={bulkForm.startTime}
                  onChange={(e) =>
                    setBulkForm((f) => ({ ...f, startTime: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>End time</Label>
                <Input
                  type="time"
                  value={bulkForm.endTime}
                  onChange={(e) =>
                    setBulkForm((f) => ({ ...f, endTime: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <Label>Carers required</Label>
              <Input
                type="number"
                min="1"
                placeholder="Keep existing"
                value={bulkForm.carersRequired}
                onChange={(e) =>
                  setBulkForm((f) => ({ ...f, carersRequired: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Effective from</Label>
                <Input
                  type="date"
                  value={bulkForm.effectiveFrom}
                  onChange={(e) =>
                    setBulkForm((f) => ({ ...f, effectiveFrom: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Effective to</Label>
                <Input
                  type="date"
                  value={bulkForm.effectiveTo}
                  onChange={(e) =>
                    setBulkForm((f) => ({ ...f, effectiveTo: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setBulkEditOpen(false); setBulkForm(emptyBulkForm()); }}
            >
              Cancel
            </Button>
            <Button disabled={updateMut.isPending} onClick={handleBulkEdit}>
              Apply to {selectedIds.size} slot{selectedIds.size !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk end dialog ── */}
      <Dialog
        open={bulkEndOpen}
        onOpenChange={() => { setBulkEndOpen(false); setBulkEndDate(""); }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              End {selectedIds.size} slot{selectedIds.size !== 1 ? "s" : ""}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Sets the effective-to date on all selected slots.
          </p>

          <div>
            <Label>End date</Label>
            <Input
              type="date"
              value={bulkEndDate}
              onChange={(e) => setBulkEndDate(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setBulkEndOpen(false); setBulkEndDate(""); }}
            >
              Cancel
            </Button>
            <Button
              disabled={!bulkEndDate || updateMut.isPending}
              onClick={handleBulkEnd}
            >
              End slots
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
import { Plus, Edit, Trash2, Clock, CalendarX2 } from "lucide-react";
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
  staffMemberId: string;
}

type AvailabilityRow = {
  id: string;
  dayOfWeek: string;
  availableFrom: string;
  availableTo: string;
  isAvailable: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
};

type DayOfWeekValue = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

function emptyForm() {
  return {
    days: [] as string[],
    availableFrom: "",
    availableTo: "",
    isAvailable: true,
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveTo: "",
  };
}

function emptyBulkForm() {
  return { availableFrom: "", availableTo: "", effectiveFrom: "", effectiveTo: "" };
}

export function AvailabilityList({ staffMemberId }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState(emptyBulkForm());
  const [bulkEndOpen, setBulkEndOpen] = useState(false);
  const [bulkEndDate, setBulkEndDate] = useState("");

  const utils = trpc.useUtils();

  const { data: rows = [], isLoading } =
    trpc.rota.availability.getByStaff.useQuery({ staffMemberId });

  const createMut = trpc.rota.availability.create.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.rota.availability.update.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.rota.availability.delete.useMutation({
    onError: (e) => toast.error(e.message),
  });

  function closeForm() {
    setFormOpen(false);
    setEditId(null);
    setForm(emptyForm());
  }

  function openEdit(row: AvailabilityRow) {
    setEditId(row.id);
    setForm({
      days: [row.dayOfWeek],
      availableFrom: row.availableFrom,
      availableTo: row.availableTo,
      isAvailable: row.isAvailable,
      effectiveFrom: new Date(row.effectiveFrom).toISOString().split("T")[0],
      effectiveTo: row.effectiveTo ? new Date(row.effectiveTo).toISOString().split("T")[0] : "",
    });
    setFormOpen(true);
  }

  function toggleDay(day: string) {
    setForm((f) => ({
      ...f,
      days: editId ? [day] : f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  }

  async function handleSubmit() {
    const base = {
      staffMemberId,
      availableFrom: form.availableFrom,
      availableTo: form.availableTo,
      isAvailable: form.isAvailable,
      effectiveFrom: new Date(form.effectiveFrom),
      effectiveTo: form.effectiveTo ? new Date(form.effectiveTo) : undefined,
    };

    try {
      if (editId) {
        await updateMut.mutateAsync({ id: editId, dayOfWeek: form.days[0] as DayOfWeekValue, ...base });
        utils.rota.availability.invalidate();
        closeForm();
        toast.success("Availability updated");
      } else {
        await Promise.all(
          form.days.map((day) => createMut.mutateAsync({ ...base, dayOfWeek: day as DayOfWeekValue })),
        );
        utils.rota.availability.invalidate();
        closeForm();
        toast.success(form.days.length > 1 ? `${form.days.length} availability windows added` : "Availability added");
      }
    } catch {
      // onError callbacks handle the toast
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(selectedIds.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function toggleSelectDay(daySlots: typeof rows) {
    const ids = daySlots.map((r) => r.id);
    const allDaySelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allDaySelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) => deleteMut.mutateAsync({ id })));
      utils.rota.availability.invalidate();
      setSelectedIds(new Set());
      toast.success(`${ids.length} window${ids.length !== 1 ? "s" : ""} removed`);
    } catch {
      // onError callbacks handle the toast
    }
  }

  async function handleBulkEnd() {
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) => updateMut.mutateAsync({ id, effectiveTo: new Date(bulkEndDate) })));
      utils.rota.availability.invalidate();
      setSelectedIds(new Set());
      setBulkEndOpen(false);
      setBulkEndDate("");
      toast.success(`${ids.length} window${ids.length !== 1 ? "s" : ""} ended`);
    } catch {
      // onError callbacks handle the toast
    }
  }

  async function handleBulkEdit() {
    const ids = [...selectedIds];
    const changes: Record<string, unknown> = {};
    if (bulkForm.availableFrom) changes.availableFrom = bulkForm.availableFrom;
    if (bulkForm.availableTo) changes.availableTo = bulkForm.availableTo;
    if (bulkForm.effectiveFrom) changes.effectiveFrom = new Date(bulkForm.effectiveFrom);
    if (bulkForm.effectiveTo) changes.effectiveTo = new Date(bulkForm.effectiveTo);

    if (Object.keys(changes).length === 0) {
      toast.error("Fill in at least one field to apply");
      return;
    }

    try {
      await Promise.all(
        ids.map((id) => updateMut.mutateAsync({ id, ...changes } as Parameters<typeof updateMut.mutateAsync>[0])),
      );
      utils.rota.availability.invalidate();
      setSelectedIds(new Set());
      setBulkEditOpen(false);
      setBulkForm(emptyBulkForm());
      toast.success(`${ids.length} window${ids.length !== 1 ? "s" : ""} updated`);
    } catch {
      // onError callbacks handle the toast
    }
  }

  const isValid = form.days.length > 0 && form.availableFrom && form.availableTo && form.effectiveFrom;

  const byDay = [...rows].sort(
    (a, b) => (DAY_ORDER[a.dayOfWeek] ?? 0) - (DAY_ORDER[b.dayOfWeek] ?? 0) || a.availableFrom.localeCompare(b.availableFrom),
  );
  const grouped = byDay.reduce<Record<string, typeof rows>>((acc, r) => {
    (acc[r.dayOfWeek] ??= []).push(r);
    return acc;
  }, {});

  const allSelected = rows.length > 0 && selectedIds.size === rows.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div>
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Recurring availability</CardTitle>
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add window
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading availability...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No availability recorded yet. Add a window to show when this staff member can be scheduled.
            </p>
          ) : (
            <div className="space-y-3">
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
                    <Button size="sm" variant="outline" onClick={() => setBulkEditOpen(true)}>
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setBulkEndOpen(true)}>
                      <CalendarX2 className="h-3.5 w-3.5 mr-1" />
                      End
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={deleteMut.isPending}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              {DAYS_OF_WEEK.filter((d) => grouped[d.value]).map((d) => {
                const daySlots = grouped[d.value];
                const allDaySelected = daySlots.every((r) => selectedIds.has(r.id));
                const someDaySelected = daySlots.some((r) => selectedIds.has(r.id)) && !allDaySelected;

                return (
                  <div key={d.value}>
                    <div className="flex items-center gap-2 mb-1">
                      <Checkbox
                        checked={allDaySelected ? true : someDaySelected ? "indeterminate" : false}
                        onCheckedChange={() => toggleSelectDay(daySlots)}
                      />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{d.label}</p>
                    </div>
                    <div className="space-y-1">
                      {daySlots.map((row) => (
                        <div
                          key={row.id}
                          className={cn(
                            "flex items-center justify-between rounded-md border px-3 py-2 text-sm",
                            selectedIds.has(row.id) && "bg-muted/50 border-primary/30",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => toggleSelect(row.id)} />
                            <span className="flex items-center gap-1.5 font-medium tabular-nums">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              {row.availableFrom}–{row.availableTo}
                            </span>
                            {!row.isAvailable && <Badge variant="secondary">Unavailable</Badge>}
                            {row.effectiveTo && (
                              <span className="text-xs text-muted-foreground">
                                until {fmtDate.format(new Date(row.effectiveTo))}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row as AvailabilityRow)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => deleteMut.mutate({ id: row.id }, { onSuccess: () => utils.rota.availability.invalidate() })}
                              disabled={deleteMut.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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

      <Dialog open={formOpen} onOpenChange={() => closeForm()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit availability window" : "Add availability window"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">{editId ? "Day of week" : "Days of week"}</Label>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {DAYS_OF_WEEK.map((d) => (
                  <label
                    key={d.value}
                    className={cn(
                      "flex items-center gap-2 cursor-pointer select-none rounded px-1 py-0.5",
                      "hover:bg-muted/60 transition-colors",
                    )}
                  >
                    <Checkbox checked={form.days.includes(d.value)} onCheckedChange={() => toggleDay(d.value)} />
                    <span className="text-sm">{d.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Available from</Label>
                <Input type="time" value={form.availableFrom} onChange={(e) => setForm((f) => ({ ...f, availableFrom: e.target.value }))} />
              </div>
              <div>
                <Label>Available to</Label>
                <Input type="time" value={form.availableTo} onChange={(e) => setForm((f) => ({ ...f, availableTo: e.target.value }))} />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
              <Checkbox checked={form.isAvailable} onCheckedChange={(v) => setForm((f) => ({ ...f, isAvailable: v === true }))} />
              Available during this window
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Effective from</Label>
                <Input type="date" value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} />
              </div>
              <div>
                <Label>Effective to</Label>
                <Input type="date" value={form.effectiveTo} onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button disabled={!isValid || createMut.isPending || updateMut.isPending} onClick={handleSubmit}>
              {editId ? "Update" : "Add window"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkEditOpen} onOpenChange={() => { setBulkEditOpen(false); setBulkForm(emptyBulkForm()); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {selectedIds.size} window{selectedIds.size !== 1 ? "s" : ""}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">Leave a field blank to keep each window&apos;s existing value.</p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Available from</Label>
                <Input type="time" value={bulkForm.availableFrom} onChange={(e) => setBulkForm((f) => ({ ...f, availableFrom: e.target.value }))} />
              </div>
              <div>
                <Label>Available to</Label>
                <Input type="time" value={bulkForm.availableTo} onChange={(e) => setBulkForm((f) => ({ ...f, availableTo: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Effective from</Label>
                <Input type="date" value={bulkForm.effectiveFrom} onChange={(e) => setBulkForm((f) => ({ ...f, effectiveFrom: e.target.value }))} />
              </div>
              <div>
                <Label>Effective to</Label>
                <Input type="date" value={bulkForm.effectiveTo} onChange={(e) => setBulkForm((f) => ({ ...f, effectiveTo: e.target.value }))} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setBulkEditOpen(false); setBulkForm(emptyBulkForm()); }}>Cancel</Button>
            <Button disabled={updateMut.isPending} onClick={handleBulkEdit}>
              Apply to {selectedIds.size} window{selectedIds.size !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkEndOpen} onOpenChange={() => { setBulkEndOpen(false); setBulkEndDate(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>End {selectedIds.size} window{selectedIds.size !== 1 ? "s" : ""}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">Sets the effective-to date on all selected windows.</p>

          <div>
            <Label>End date</Label>
            <Input type="date" value={bulkEndDate} onChange={(e) => setBulkEndDate(e.target.value)} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setBulkEndOpen(false); setBulkEndDate(""); }}>Cancel</Button>
            <Button disabled={!bulkEndDate || updateMut.isPending} onClick={handleBulkEnd}>End windows</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

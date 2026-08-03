"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarClock, Plus, Pencil, Ban, Trash2, Repeat } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const DAYS_OF_WEEK = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
] as const;

type RotaVisitRow = {
  id: string;
  visitDate: Date;
  startTime: string;
  endTime: string;
  carersRequired: number;
  status: string;
  notes: string | null;
  assignments: { staffMember: { id: string; firstName: string; lastName: string } }[];
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  UNASSIGNED: "bg-orange-50 text-orange-700 border-orange-200",
  PARTIALLY_ASSIGNED: "bg-blue-50 text-blue-700 border-blue-200",
  ASSIGNED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  UNASSIGNED: "Unassigned",
  PARTIALLY_ASSIGNED: "Partially assigned",
  ASSIGNED: "Assigned",
  CANCELLED: "Cancelled",
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

const visitSchema = z.object({
  visitDate: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  carersRequired: z.string().min(1),
  notes: z.string().optional(),
});

type VisitForm = z.infer<typeof visitSchema>;

function VisitDialog({
  open, onClose, serviceUserId, editing, onSuccess,
}: {
  open: boolean; onClose: () => void; serviceUserId: string;
  editing: RotaVisitRow | null; onSuccess: () => void;
}) {
  const form = useForm<VisitForm>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      visitDate: editing?.visitDate ? new Date(editing.visitDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      startTime: editing?.startTime ?? "",
      endTime: editing?.endTime ?? "",
      carersRequired: editing ? String(editing.carersRequired) : "1",
      notes: editing?.notes ?? "",
    },
  });

  const createMut = trpc.rota.visits.create.useMutation({
    onSuccess: () => { toast.success("Visit added"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.rota.visits.update.useMutation({
    onSuccess: () => { toast.success("Visit updated"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  function onSubmit(v: VisitForm) {
    const payload = {
      visitDate: new Date(v.visitDate),
      startTime: v.startTime,
      endTime: v.endTime,
      carersRequired: parseInt(v.carersRequired, 10),
      notes: v.notes || undefined,
    };
    if (editing) {
      updateMut.mutate({ id: editing.id, ...payload });
    } else {
      createMut.mutate({ serviceUserId, ...payload });
    }
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit visit" : "Add visit"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="visitDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Date <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="startTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start time <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="endTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>End time <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="carersRequired" render={({ field }) => (
              <FormItem>
                <FormLabel>Carers required</FormLabel>
                <FormControl><Input type="number" min="1" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea {...field} rows={2} placeholder="Optional notes about this visit" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : editing ? "Save Changes" : "Add Visit"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function emptyRecurringForm() {
  return {
    days: [] as string[],
    startTime: "",
    endTime: "",
    carersRequired: "1",
    notes: "",
    rangeStart: new Date().toISOString().split("T")[0],
    rangeEnd: "",
  };
}

function RecurringVisitDialog({
  open, onClose, serviceUserId, onSuccess,
}: {
  open: boolean; onClose: () => void; serviceUserId: string; onSuccess: () => void;
}) {
  const [form, setForm] = useState(emptyRecurringForm());

  const createRecurringMut = trpc.rota.visits.createRecurring.useMutation({
    onSuccess: (result) => {
      toast.success(
        `${result.createdCount} visit${result.createdCount !== 1 ? "s" : ""} created` +
          (result.skippedCount > 0 ? ` (${result.skippedCount} already existed)` : ""),
      );
      onSuccess();
      close();
    },
    onError: (e) => toast.error(e.message),
  });

  function close() {
    setForm(emptyRecurringForm());
    onClose();
  }

  function toggleDay(day: string) {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  }

  function handleSubmit() {
    createRecurringMut.mutate({
      serviceUserId,
      daysOfWeek: form.days as ("MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY")[],
      startTime: form.startTime,
      endTime: form.endTime,
      carersRequired: parseInt(form.carersRequired, 10),
      notes: form.notes || undefined,
      rangeStart: new Date(form.rangeStart),
      rangeEnd: new Date(form.rangeEnd),
    });
  }

  const isValid =
    form.days.length > 0 && form.startTime && form.endTime && form.rangeStart && form.rangeEnd &&
    form.rangeEnd >= form.rangeStart;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add recurring visits</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Days of week</Label>
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
              <Label>Start time</Label>
              <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div>
              <Label>End time</Label>
              <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label>Carers required</Label>
            <Input type="number" min="1" value={form.carersRequired} onChange={(e) => setForm((f) => ({ ...f, carersRequired: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>From</Label>
              <Input type="date" value={form.rangeStart} onChange={(e) => setForm((f) => ({ ...f, rangeStart: e.target.value }))} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={form.rangeEnd} onChange={(e) => setForm((f) => ({ ...f, rangeEnd: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional notes applied to every visit created" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button disabled={!isValid || createRecurringMut.isPending} onClick={handleSubmit}>
            {createRecurringMut.isPending ? "Creating…" : "Create visits"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface RotaVisitListProps {
  serviceUserId: string;
}

export function RotaVisitList({ serviceUserId }: RotaVisitListProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RotaVisitRow | null>(null);
  const [recurringOpen, setRecurringOpen] = useState(false);

  const { data: visits = [], refetch } = trpc.rota.visits.listByServiceUser.useQuery({ serviceUserId });

  const cancelMut = trpc.rota.visits.cancel.useMutation({
    onSuccess: () => { toast.success("Visit cancelled"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.rota.visits.delete.useMutation({
    onSuccess: () => { toast.success("Visit removed"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4" />
            Planned Care Visits
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setRecurringOpen(true)}>
              <Repeat className="h-4 w-4 mr-1" />Add recurring visits
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />Add Visit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {visits.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No visits scheduled. Add a visit — staff are assigned from the main Rota screen.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Carers</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="text-sm">{formatDate(v.visitDate)}</TableCell>
                    <TableCell className="text-sm tabular-nums">{v.startTime}–{v.endTime}</TableCell>
                    <TableCell className="text-sm">{v.carersRequired}</TableCell>
                    <TableCell className="text-sm">
                      {v.assignments.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {v.assignments.map((a) => (
                            <Badge key={a.staffMember.id} variant="outline" className="text-xs">
                              {a.staffMember.firstName} {a.staffMember.lastName}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${STATUS_BADGE_CLASS[v.status] ?? ""}`}>
                        {STATUS_LABELS[v.status] ?? v.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {v.status !== "CANCELLED" && (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => { setEditing(v as RotaVisitRow); setOpen(true); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => cancelMut.mutate({ id: v.id })}
                              disabled={cancelMut.isPending}>
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {v.assignments.length === 0 && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                            onClick={() => deleteMut.mutate({ id: v.id })}
                            disabled={deleteMut.isPending}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <VisitDialog
        open={open}
        onClose={() => setOpen(false)}
        serviceUserId={serviceUserId}
        editing={editing}
        onSuccess={() => { refetch(); }}
      />
      <RecurringVisitDialog
        open={recurringOpen}
        onClose={() => setRecurringOpen(false)}
        serviceUserId={serviceUserId}
        onSuccess={() => { refetch(); }}
      />
    </div>
  );
}

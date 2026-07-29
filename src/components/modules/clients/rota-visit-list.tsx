"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarClock, Plus, Pencil, Ban, Trash2 } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

interface RotaVisitListProps {
  serviceUserId: string;
}

export function RotaVisitList({ serviceUserId }: RotaVisitListProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RotaVisitRow | null>(null);

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
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />Add Visit
          </Button>
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
    </div>
  );
}

"use client";

import { use, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  MessageSquare, Plus, Pencil, AlertTriangle, ChevronDown, ChevronRight, Trash2,
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

// ── Types ────────────────────────────────────────────────────────────────────

type AgreedAction = { action: string; dueDate?: string; completed: boolean };

type Supervision = {
  id: string;
  supervisionDate: Date;
  supervisionType: string;
  discussionNotes: string | null;
  agreedActions: unknown;
  nextSupervisionDate: Date | null;
  supervisor: { id: string; firstName: string; lastName: string } | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
}

const TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: "Individual",
  GROUP: "Group",
  SPOT_CHECK: "Spot Check",
  OBSERVATION: "Observation",
};

const SUPERVISION_SCHEMA = z.object({
  supervisionDate: z.string().min(1, "Date is required"),
  supervisionType: z.enum(["INDIVIDUAL", "GROUP", "SPOT_CHECK", "OBSERVATION"]),
  supervisorId: z.string().optional(),
  discussionNotes: z.string().optional(),
  nextSupervisionDate: z.string().optional(),
  agreedActions: z.array(
    z.object({
      action: z.string(),
      dueDate: z.string().optional(),
      completed: z.boolean(),
    })
  ),
});

type SupervisionForm = z.infer<typeof SUPERVISION_SCHEMA>;

// ── Action checklist within a card ───────────────────────────────────────────

function ActionChecklist({
  supervision,
  onSaved,
}: {
  supervision: Supervision;
  onSaved: () => void;
}) {
  const actions = (supervision.agreedActions as AgreedAction[] | null) ?? [];
  const updateMutation = trpc.staff.supervision.update.useMutation({
    onSuccess: () => { toast.success("Actions updated"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });

  function toggle(index: number, checked: boolean) {
    const updated = actions.map((a, i) =>
      i === index ? { ...a, completed: checked } : a
    );
    updateMutation.mutate({ id: supervision.id, agreedActions: updated });
  }

  if (actions.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Agreed Actions</p>
      {actions.map((a, i) => (
        <div key={i} className="flex items-start gap-2">
          <Checkbox
            checked={a.completed}
            onCheckedChange={(v) => toggle(i, Boolean(v))}
            disabled={updateMutation.isPending}
            className="mt-0.5"
          />
          <div className="min-w-0">
            <p className={`text-sm ${a.completed ? "line-through text-muted-foreground" : ""}`}>
              {a.action}
            </p>
            {a.dueDate && (
              <p className="text-xs text-muted-foreground">Due: {a.dueDate}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Dialog ───────────────────────────────────────────────────────────────────

function SupervisionDialog({
  open, onClose, staffMemberId, editing, onSuccess,
}: {
  open: boolean; onClose: () => void; staffMemberId: string;
  editing: Supervision | null; onSuccess: () => void;
}) {
  const existingActions = (editing?.agreedActions as AgreedAction[] | null) ?? [];

  const form = useForm<SupervisionForm>({
    resolver: zodResolver(SUPERVISION_SCHEMA),
    defaultValues: {
      supervisionDate: editing?.supervisionDate
        ? new Date(editing.supervisionDate).toISOString().split("T")[0] : "",
      supervisionType: (editing?.supervisionType as SupervisionForm["supervisionType"]) ?? "INDIVIDUAL",
      supervisorId: editing?.supervisor?.id ?? "",
      discussionNotes: editing?.discussionNotes ?? "",
      nextSupervisionDate: editing?.nextSupervisionDate
        ? new Date(editing.nextSupervisionDate).toISOString().split("T")[0] : "",
      agreedActions: existingActions.map((a) => ({
        action: a.action, dueDate: a.dueDate ?? "", completed: a.completed,
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "agreedActions",
  });

  const createMut = trpc.staff.supervision.create.useMutation({
    onSuccess: () => { toast.success("Supervision logged"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.staff.supervision.update.useMutation({
    onSuccess: () => { toast.success("Supervision updated"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  function onSubmit(v: SupervisionForm) {
    const actions = v.agreedActions.map((a) => ({
      action: a.action, dueDate: a.dueDate || undefined, completed: a.completed,
    }));
    const payload = {
      supervisionDate: new Date(v.supervisionDate),
      supervisionType: v.supervisionType as never,
      supervisorId: v.supervisorId || undefined,
      discussionNotes: v.discussionNotes || undefined,
      nextSupervisionDate: v.nextSupervisionDate ? new Date(v.nextSupervisionDate) : undefined,
      agreedActions: actions.length > 0 ? actions : undefined,
    };
    if (editing) {
      updateMut.mutate({ id: editing.id, ...payload });
    } else {
      createMut.mutate({ staffMemberId, ...payload });
    }
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Supervision" : "Log Supervision"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="supervisionDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="supervisionType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="nextSupervisionDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Next Supervision Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="discussionNotes" render={({ field }) => (
              <FormItem>
                <FormLabel>Discussion Notes</FormLabel>
                <FormControl><Textarea {...field} rows={4} placeholder="Key discussion points…" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Agreed Actions</p>
                <Button type="button" size="sm" variant="outline"
                  onClick={() => append({ action: "", dueDate: "", completed: false })}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Add Action
                </Button>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1.5">
                    <FormField control={form.control} name={`agreedActions.${index}.action`} render={({ field }) => (
                      <FormItem>
                        <FormControl><Input {...field} placeholder="Action item…" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="flex gap-2 items-center">
                      <FormField control={form.control} name={`agreedActions.${index}.dueDate`} render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl><Input type="date" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name={`agreedActions.${index}.completed`} render={({ field }) => (
                        <FormItem className="flex items-center gap-1.5 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-xs font-normal">Done</FormLabel>
                        </FormItem>
                      )} />
                    </div>
                  </div>
                  <Button type="button" size="icon" variant="ghost" className="mt-1 h-7 w-7 shrink-0"
                    onClick={() => remove(index)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : editing ? "Save Changes" : "Log Supervision"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Supervision card ──────────────────────────────────────────────────────────

function SupervisionCard({
  s, onEdit, onSaved,
}: {
  s: Supervision; onEdit: (s: Supervision) => void; onSaved: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const actions = (s.agreedActions as AgreedAction[] | null) ?? [];
  const completed = actions.filter((a) => a.completed).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4">
        <button
          type="button"
          className="flex items-center gap-3 flex-1 text-left"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded
            ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{formatDate(s.supervisionDate)}</span>
              <Badge variant="secondary" className="text-xs">{TYPE_LABELS[s.supervisionType] ?? s.supervisionType}</Badge>
              {s.supervisor && (
                <span className="text-xs text-muted-foreground">
                  with {s.supervisor.firstName} {s.supervisor.lastName}
                </span>
              )}
            </div>
            {actions.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {completed}/{actions.length} actions completed
                {s.nextSupervisionDate ? ` · Next: ${formatDate(s.nextSupervisionDate)}` : ""}
              </p>
            )}
          </div>
        </button>
        <Button size="icon" variant="ghost" className="shrink-0 h-8 w-8"
          onClick={() => onEdit(s)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 px-4 pb-4">
          <Separator className="mb-3" />
          {s.discussionNotes && (
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{s.discussionNotes}</p>
            </div>
          )}
          <ActionChecklist supervision={s} onSaved={onSaved} />
          {s.nextSupervisionDate && (
            <p className="text-xs text-muted-foreground mt-3">
              Next supervision scheduled: <strong>{formatDate(s.nextSupervisionDate)}</strong>
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

// Captured at module load time — safe to use in render (not a per-render call)
const PAGE_LOAD_TIME = Date.now();

export default function StaffSupervisionPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supervision | null>(null);

  const { data: supervisions = [], refetch } = trpc.staff.supervision.getByStaff.useQuery({
    staffMemberId: id,
  });

  const last = supervisions[0];
  const daysSinceLast = last
    ? Math.floor((PAGE_LOAD_TIME - new Date(last.supervisionDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const overdue = daysSinceLast === null || daysSinceLast > 90;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Supervision Sessions</h2>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />Log Supervision
        </Button>
      </div>

      {overdue && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {daysSinceLast === null
            ? "No supervision sessions recorded yet."
            : `Last supervision was ${daysSinceLast} days ago — overdue (target: every 3 months).`}
        </div>
      )}

      {supervisions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            No supervision sessions logged.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {supervisions.map((s) => (
            <SupervisionCard
              key={s.id}
              s={s as Supervision}
              onEdit={(sv) => { setEditing(sv); setOpen(true); }}
              onSaved={refetch}
            />
          ))}
        </div>
      )}

      <SupervisionDialog
        open={open}
        onClose={() => setOpen(false)}
        staffMemberId={id}
        editing={editing}
        onSuccess={refetch}
      />
    </div>
  );
}

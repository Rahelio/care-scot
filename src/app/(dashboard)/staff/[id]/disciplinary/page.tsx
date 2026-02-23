"use client";

import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ShieldAlert, Plus, Pencil, ChevronDown, ChevronRight,
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

// ── Types ────────────────────────────────────────────────────────────────────

type DisciplinaryRecord = {
  id: string;
  recordType: string;
  dateRaised: Date;
  description: string | null;
  investigationNotes: string | null;
  outcome: string | null;
  sanctionLevel: string | null;
  appealOutcome: string | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
}

const RECORD_TYPE_LABELS: Record<string, string> = {
  DISCIPLINARY: "Disciplinary",
  GRIEVANCE: "Grievance",
  CAPABILITY: "Capability",
  WARNING: "Warning",
};

const SANCTION_LABELS: Record<string, string> = {
  VERBAL: "Verbal Warning",
  WRITTEN: "Written Warning",
  FINAL: "Final Warning",
  DISMISSAL: "Dismissal",
};

const RECORD_TYPE_COLORS: Record<string, string> = {
  DISCIPLINARY: "text-red-700 bg-red-50 border-red-200",
  GRIEVANCE: "text-amber-700 bg-amber-50 border-amber-200",
  CAPABILITY: "text-blue-700 bg-blue-50 border-blue-200",
  WARNING: "text-orange-700 bg-orange-50 border-orange-200",
};

const SANCTION_COLORS: Record<string, string> = {
  VERBAL: "text-amber-700 bg-amber-50 border-amber-200",
  WRITTEN: "text-orange-700 bg-orange-50 border-orange-200",
  FINAL: "text-red-700 bg-red-50 border-red-200",
  DISMISSAL: "text-red-900 bg-red-100 border-red-300",
};

// ── Schema ───────────────────────────────────────────────────────────────────

const DISCIPLINARY_SCHEMA = z.object({
  recordType: z.enum(["DISCIPLINARY", "GRIEVANCE", "CAPABILITY", "WARNING"]),
  dateRaised: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  investigationNotes: z.string().optional(),
  outcome: z.string().optional(),
  sanctionLevel: z.enum(["VERBAL", "WRITTEN", "FINAL", "DISMISSAL"]).optional(),
  appealOutcome: z.string().optional(),
});

type DisciplinaryForm = z.infer<typeof DISCIPLINARY_SCHEMA>;

// ── Dialog ───────────────────────────────────────────────────────────────────

function DisciplinaryDialog({
  open, onClose, staffMemberId, editing, onSuccess,
}: {
  open: boolean; onClose: () => void; staffMemberId: string;
  editing: DisciplinaryRecord | null; onSuccess: () => void;
}) {
  const form = useForm<DisciplinaryForm>({
    resolver: zodResolver(DISCIPLINARY_SCHEMA),
    defaultValues: {
      recordType: (editing?.recordType as DisciplinaryForm["recordType"]) ?? "DISCIPLINARY",
      dateRaised: editing?.dateRaised
        ? new Date(editing.dateRaised).toISOString().split("T")[0] : "",
      description: editing?.description ?? "",
      investigationNotes: editing?.investigationNotes ?? "",
      outcome: editing?.outcome ?? "",
      sanctionLevel: (editing?.sanctionLevel as DisciplinaryForm["sanctionLevel"]) ?? undefined,
      appealOutcome: editing?.appealOutcome ?? "",
    },
  });

  const createMut = trpc.staff.disciplinary.create.useMutation({
    onSuccess: () => { toast.success("Disciplinary record created"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.staff.disciplinary.update.useMutation({
    onSuccess: () => { toast.success("Disciplinary record updated"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  function onSubmit(v: DisciplinaryForm) {
    const payload = {
      recordType: v.recordType as never,
      dateRaised: new Date(v.dateRaised),
      description: v.description || undefined,
      investigationNotes: v.investigationNotes || undefined,
      outcome: v.outcome || undefined,
      sanctionLevel: (v.sanctionLevel as never) || undefined,
      appealOutcome: v.appealOutcome || undefined,
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
          <DialogTitle>{editing ? "Edit Record" : "Add Disciplinary Record"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="recordType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(RECORD_TYPE_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dateRaised" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date Raised <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea {...field} rows={3} placeholder="Describe the matter…" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="investigationNotes" render={({ field }) => (
              <FormItem>
                <FormLabel>Investigation Notes</FormLabel>
                <FormControl><Textarea {...field} rows={3} placeholder="Investigation findings…" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="outcome" render={({ field }) => (
              <FormItem>
                <FormLabel>Outcome</FormLabel>
                <FormControl><Textarea {...field} rows={2} placeholder="Decision / outcome…" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="sanctionLevel" render={({ field }) => (
              <FormItem>
                <FormLabel>Sanction Level</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {Object.entries(SANCTION_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="appealOutcome" render={({ field }) => (
              <FormItem>
                <FormLabel>Appeal Outcome</FormLabel>
                <FormControl><Textarea {...field} rows={2} placeholder="Appeal decision (if any)…" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : editing ? "Save Changes" : "Add Record"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────

function DisciplinaryCard({
  record, onEdit,
}: {
  record: DisciplinaryRecord; onEdit: (r: DisciplinaryRecord) => void;
}) {
  const [expanded, setExpanded] = useState(false);

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
              <span className="font-medium text-sm">{formatDate(record.dateRaised)}</span>
              <Badge variant="secondary" className={`text-xs ${RECORD_TYPE_COLORS[record.recordType] ?? ""}`}>
                {RECORD_TYPE_LABELS[record.recordType] ?? record.recordType}
              </Badge>
              {record.sanctionLevel && (
                <Badge variant="secondary" className={`text-xs ${SANCTION_COLORS[record.sanctionLevel] ?? ""}`}>
                  {SANCTION_LABELS[record.sanctionLevel] ?? record.sanctionLevel}
                </Badge>
              )}
            </div>
            {record.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {record.description}
              </p>
            )}
          </div>
        </button>
        <Button size="icon" variant="ghost" className="shrink-0 h-8 w-8"
          onClick={() => onEdit(record)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 px-4 pb-4">
          <Separator className="mb-3" />
          {record.description && (
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm whitespace-pre-wrap">{record.description}</p>
            </div>
          )}
          {record.investigationNotes && (
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Investigation Notes</p>
              <p className="text-sm whitespace-pre-wrap">{record.investigationNotes}</p>
            </div>
          )}
          {record.outcome && (
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Outcome</p>
              <p className="text-sm whitespace-pre-wrap">{record.outcome}</p>
            </div>
          )}
          {record.appealOutcome && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Appeal Outcome</p>
              <p className="text-sm whitespace-pre-wrap">{record.appealOutcome}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function StaffDisciplinaryPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DisciplinaryRecord | null>(null);

  const { data: records = [], refetch } = trpc.staff.disciplinary.getByStaff.useQuery({
    staffMemberId: id,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Disciplinary Records</h2>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />Add Record
        </Button>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            No disciplinary records.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <DisciplinaryCard
              key={r.id}
              record={r as DisciplinaryRecord}
              onEdit={(rec) => { setEditing(rec); setOpen(true); }}
            />
          ))}
        </div>
      )}

      <DisciplinaryDialog
        open={open}
        onClose={() => setOpen(false)}
        staffMemberId={id}
        editing={editing}
        onSuccess={refetch}
      />
    </div>
  );
}

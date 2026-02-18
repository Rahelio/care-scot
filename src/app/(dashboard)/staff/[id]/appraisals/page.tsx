"use client";

import { use, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Star, Plus, Pencil, AlertTriangle, ChevronDown, ChevronRight, Trash2 } from "lucide-react";

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

type Goal = { goal: string; targetDate?: string; status: string };
type CompetencyRating = { competency: string; rating: number };

type Appraisal = {
  id: string;
  appraisalDate: Date;
  appraiserId: string | null;
  performanceSummary: string | null;
  developmentPlan: string | null;
  goals: unknown;
  competencyRatings: unknown;
  nextAppraisalDate: Date | null;
  appraiser: { id: string; firstName: string; lastName: string } | null;
};

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
}

const GOAL_STATUS_OPTIONS = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
];

const STATUS_BADGE: Record<string, string> = {
  NOT_STARTED: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
};

// ── Appraisal dialog ──────────────────────────────────────────────────────────

const appraisalSchema = z.object({
  appraisalDate: z.string().min(1, "Date is required"),
  nextAppraisalDate: z.string().optional(),
  performanceSummary: z.string().optional(),
  developmentPlan: z.string().optional(),
  goals: z.array(z.object({
    goal: z.string(),
    targetDate: z.string().optional(),
    status: z.string(),
  })),
  competencyRatings: z.array(z.object({
    competency: z.string(),
    rating: z.string(), // kept as string in form, converted in onSubmit
  })),
});

type AppraisalForm = z.infer<typeof appraisalSchema>;

function AppraisalDialog({
  open, onClose, staffMemberId, editing, onSuccess,
}: {
  open: boolean; onClose: () => void; staffMemberId: string;
  editing: Appraisal | null; onSuccess: () => void;
}) {
  const existingGoals = (editing?.goals as Goal[] | null) ?? [];
  const existingRatings = editing?.competencyRatings
    ? Object.entries(editing.competencyRatings as Record<string, number>).map(([competency, rating]) => ({
        competency, rating: String(rating),
      }))
    : [];

  const form = useForm<AppraisalForm>({
    resolver: zodResolver(appraisalSchema),
    defaultValues: {
      appraisalDate: editing?.appraisalDate
        ? new Date(editing.appraisalDate).toISOString().split("T")[0] : "",
      nextAppraisalDate: editing?.nextAppraisalDate
        ? new Date(editing.nextAppraisalDate).toISOString().split("T")[0] : "",
      performanceSummary: editing?.performanceSummary ?? "",
      developmentPlan: editing?.developmentPlan ?? "",
      goals: existingGoals.map((g) => ({ goal: g.goal, targetDate: g.targetDate ?? "", status: g.status })),
      competencyRatings: existingRatings,
    },
  });

  const goals = useFieldArray({ control: form.control, name: "goals" });
  const ratings = useFieldArray({ control: form.control, name: "competencyRatings" });

  const createMut = trpc.staff.appraisal.create.useMutation({
    onSuccess: () => { toast.success("Appraisal added"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.staff.appraisal.update.useMutation({
    onSuccess: () => { toast.success("Appraisal updated"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  function onSubmit(v: AppraisalForm) {
    const payload = {
      appraisalDate: new Date(v.appraisalDate),
      nextAppraisalDate: v.nextAppraisalDate ? new Date(v.nextAppraisalDate) : undefined,
      performanceSummary: v.performanceSummary || undefined,
      developmentPlan: v.developmentPlan || undefined,
      goals: v.goals.length > 0
        ? v.goals.map((g) => ({ goal: g.goal, targetDate: g.targetDate || undefined, status: g.status }))
        : undefined,
      competencyRatings: v.competencyRatings.length > 0
        ? v.competencyRatings
            .filter((r) => r.competency && r.rating)
            .map((r) => ({ competency: r.competency, rating: parseInt(r.rating, 10) }))
        : undefined,
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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Appraisal" : "Add Appraisal"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="appraisalDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Appraisal Date <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="nextAppraisalDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Next Appraisal Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="performanceSummary" render={({ field }) => (
              <FormItem>
                <FormLabel>Performance Summary</FormLabel>
                <FormControl><Textarea {...field} rows={3} placeholder="Overall performance this period…" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="developmentPlan" render={({ field }) => (
              <FormItem>
                <FormLabel>Development Plan</FormLabel>
                <FormControl><Textarea {...field} rows={3} placeholder="Training, skills, career development…" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Separator />

            {/* Goals */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Goals</p>
                <Button type="button" size="sm" variant="outline"
                  onClick={() => goals.append({ goal: "", targetDate: "", status: "NOT_STARTED" })}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Add Goal
                </Button>
              </div>
              {goals.fields.map((f, i) => (
                <div key={f.id} className="border rounded-md p-3 space-y-2">
                  <div className="flex gap-2">
                    <FormField control={form.control} name={`goals.${i}.goal`} render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl><Input {...field} placeholder="Goal description…" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0"
                      onClick={() => goals.remove(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField control={form.control} name={`goals.${i}.targetDate`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Target Date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`goals.${i}.status`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {GOAL_STATUS_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Competency Ratings */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Competency Ratings (1–5)</p>
                <Button type="button" size="sm" variant="outline"
                  onClick={() => ratings.append({ competency: "", rating: "" })}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Add Rating
                </Button>
              </div>
              {ratings.fields.map((f, i) => (
                <div key={f.id} className="flex gap-2 items-center">
                  <FormField control={form.control} name={`competencyRatings.${i}.competency`} render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl><Input {...field} placeholder="Competency area…" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`competencyRatings.${i}.rating`} render={({ field }) => (
                    <FormItem className="w-20">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0"
                    onClick={() => ratings.remove(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : editing ? "Save Changes" : "Add Appraisal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Appraisal card ────────────────────────────────────────────────────────────

function AppraisalCard({
  a, onEdit,
}: {
  a: Appraisal; onEdit: (a: Appraisal) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const goals = (a.goals as Goal[] | null) ?? [];
  const ratings = a.competencyRatings as Record<string, number> | null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4">
        <button type="button" className="flex items-center gap-3 flex-1 text-left"
          onClick={() => setExpanded(!expanded)}>
          {expanded
            ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{formatDate(a.appraisalDate)}</span>
              {a.appraiser && (
                <span className="text-xs text-muted-foreground">
                  by {a.appraiser.firstName} {a.appraiser.lastName}
                </span>
              )}
              {goals.length > 0 && (
                <Badge variant="outline" className="text-xs">{goals.length} goal{goals.length > 1 ? "s" : ""}</Badge>
              )}
            </div>
            {a.nextAppraisalDate && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Next: {formatDate(a.nextAppraisalDate)}
              </p>
            )}
          </div>
        </button>
        <Button size="icon" variant="ghost" className="shrink-0 h-8 w-8" onClick={() => onEdit(a)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 px-4 pb-4 space-y-4">
          <Separator />
          {a.performanceSummary && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Performance Summary</p>
              <p className="text-sm whitespace-pre-wrap">{a.performanceSummary}</p>
            </div>
          )}
          {a.developmentPlan && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Development Plan</p>
              <p className="text-sm whitespace-pre-wrap">{a.developmentPlan}</p>
            </div>
          )}
          {goals.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Goals</p>
              <div className="space-y-1.5">
                {goals.map((g, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Badge className={`text-xs shrink-0 mt-0.5 ${STATUS_BADGE[g.status] ?? ""}`}>
                      {GOAL_STATUS_OPTIONS.find((o) => o.value === g.status)?.label ?? g.status}
                    </Badge>
                    <div>
                      <p className="text-sm">{g.goal}</p>
                      {g.targetDate && <p className="text-xs text-muted-foreground">Target: {g.targetDate}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {ratings && Object.keys(ratings).length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Competency Ratings</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {Object.entries(ratings).map(([comp, rating]) => (
                  <div key={comp} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate">{comp}</span>
                    <div className="flex gap-0.5 ml-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div key={n} className={`h-2 w-4 rounded-sm ${n <= rating ? "bg-primary" : "bg-muted"}`} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

// Captured at module load time — safe to use in render (not a per-render call)
const PAGE_LOAD_TIME = Date.now();

export default function StaffAppraisalsPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Appraisal | null>(null);

  const { data: appraisals = [], refetch } = trpc.staff.appraisal.getByStaff.useQuery({
    staffMemberId: id,
  });

  const last = appraisals[0];
  const daysSinceLast = last
    ? Math.floor((PAGE_LOAD_TIME - new Date(last.appraisalDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const overdue = daysSinceLast === null || daysSinceLast > 365;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Appraisals</h2>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />Add Appraisal
        </Button>
      </div>

      {overdue && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {daysSinceLast === null
            ? "No appraisals recorded yet."
            : `Last appraisal was ${daysSinceLast} days ago — overdue (target: annual).`}
        </div>
      )}

      {appraisals.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            No appraisals on record.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {appraisals.map((a) => (
            <AppraisalCard
              key={a.id}
              a={a as Appraisal}
              onEdit={(ap) => { setEditing(ap); setOpen(true); }}
            />
          ))}
        </div>
      )}

      <AppraisalDialog
        open={open}
        onClose={() => setOpen(false)}
        staffMemberId={id}
        editing={editing}
        onSuccess={refetch}
      />
    </div>
  );
}

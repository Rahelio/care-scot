"use client";

import { use, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  GraduationCap, Plus, Pencil, Trash2, CheckCircle2,
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

type CompetencyAssessment = { area: string; date: string; passed: boolean };
type ChecklistItem = { item: string; completed: boolean; date?: string };

type InductionRecord = {
  id: string;
  inductionStarted: Date | null;
  inductionCompleted: Date | null;
  mentorId: string | null;
  mentor: { id: string; firstName: string; lastName: string } | null;
  shadowShiftsCompleted: number;
  competencyAssessments: unknown;
  checklistItems: unknown;
  probationReviewNotes: string | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
}

// ── Schema ───────────────────────────────────────────────────────────────────

const INDUCTION_SCHEMA = z.object({
  inductionStarted: z.string().optional(),
  inductionCompleted: z.string().optional(),
  mentorId: z.string().optional(),
  shadowShiftsCompleted: z.string().optional(),
  probationReviewNotes: z.string().optional(),
  competencyAssessments: z.array(
    z.object({
      area: z.string(),
      date: z.string().optional(),
      passed: z.boolean(),
    })
  ),
  checklistItems: z.array(
    z.object({
      item: z.string(),
      completed: z.boolean(),
      date: z.string().optional(),
    })
  ),
});

type InductionForm = z.infer<typeof INDUCTION_SCHEMA>;

// ── Dialog ───────────────────────────────────────────────────────────────────

function InductionDialog({
  open, onClose, staffMemberId, editing, onSuccess,
}: {
  open: boolean; onClose: () => void; staffMemberId: string;
  editing: InductionRecord | null; onSuccess: () => void;
}) {
  const existingCompetencies = (editing?.competencyAssessments as CompetencyAssessment[] | null) ?? [];
  const existingChecklist = (editing?.checklistItems as ChecklistItem[] | null) ?? [];

  const { data: staffList } = trpc.staff.list.useQuery(
    { page: 1, limit: 100 },
  );

  const form = useForm<InductionForm>({
    resolver: zodResolver(INDUCTION_SCHEMA),
    defaultValues: {
      inductionStarted: editing?.inductionStarted
        ? new Date(editing.inductionStarted).toISOString().split("T")[0] : "",
      inductionCompleted: editing?.inductionCompleted
        ? new Date(editing.inductionCompleted).toISOString().split("T")[0] : "",
      mentorId: editing?.mentorId ?? "",
      shadowShiftsCompleted: editing ? String(editing.shadowShiftsCompleted) : "0",
      probationReviewNotes: editing?.probationReviewNotes ?? "",
      competencyAssessments: existingCompetencies.map((c) => ({
        area: c.area, date: c.date ?? "", passed: c.passed,
      })),
      checklistItems: existingChecklist.map((c) => ({
        item: c.item, completed: c.completed, date: c.date ?? "",
      })),
    },
  });

  const competencyFields = useFieldArray({ control: form.control, name: "competencyAssessments" });
  const checklistFields = useFieldArray({ control: form.control, name: "checklistItems" });

  const createMut = trpc.staff.induction.create.useMutation({
    onSuccess: () => { toast.success("Induction record created"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.staff.induction.update.useMutation({
    onSuccess: () => { toast.success("Induction record updated"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  function onSubmit(v: InductionForm) {
    const competencies = v.competencyAssessments
      .filter((c) => c.area.trim())
      .map((c) => ({ area: c.area, date: c.date || "", passed: c.passed }));
    const checklist = v.checklistItems
      .filter((c) => c.item.trim())
      .map((c) => ({ item: c.item, completed: c.completed, date: c.date || undefined }));

    const payload = {
      inductionStarted: v.inductionStarted ? new Date(v.inductionStarted) : undefined,
      inductionCompleted: v.inductionCompleted ? new Date(v.inductionCompleted) : undefined,
      mentorId: v.mentorId || undefined,
      shadowShiftsCompleted: parseInt(v.shadowShiftsCompleted || "0", 10),
      probationReviewNotes: v.probationReviewNotes || undefined,
      competencyAssessments: competencies.length > 0 ? competencies : undefined,
      checklistItems: checklist.length > 0 ? checklist : undefined,
    };

    if (editing) {
      updateMut.mutate({ id: editing.id, ...payload });
    } else {
      createMut.mutate({ staffMemberId, ...payload });
    }
  }

  const isPending = createMut.isPending || updateMut.isPending;
  const mentors = staffList?.items?.filter((s) => s.id !== staffMemberId) ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Induction" : "Start Induction"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="inductionStarted" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="inductionCompleted" render={({ field }) => (
                <FormItem>
                  <FormLabel>Completed Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="mentorId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mentor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select mentor…" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {mentors.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName} {s.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="shadowShiftsCompleted" render={({ field }) => (
                <FormItem>
                  <FormLabel>Shadow Shifts</FormLabel>
                  <FormControl><Input type="number" min="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="probationReviewNotes" render={({ field }) => (
              <FormItem>
                <FormLabel>Probation Review Notes</FormLabel>
                <FormControl><Textarea {...field} rows={3} placeholder="Probation review summary…" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Separator />

            {/* Checklist Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Induction Checklist</p>
                <Button type="button" size="sm" variant="outline"
                  onClick={() => checklistFields.append({ item: "", completed: false, date: "" })}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Add Item
                </Button>
              </div>
              {checklistFields.fields.map((field, i) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <FormField control={form.control} name={`checklistItems.${i}.completed`} render={({ field }) => (
                    <FormItem className="space-y-0 mt-2.5">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <FormField control={form.control} name={`checklistItems.${i}.item`} render={({ field }) => (
                      <FormItem>
                        <FormControl><Input {...field} placeholder="Checklist item…" /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`checklistItems.${i}.date`} render={({ field }) => (
                      <FormItem>
                        <FormControl><Input type="date" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9 mt-0 shrink-0"
                    onClick={() => checklistFields.remove(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <Separator />

            {/* Competency Assessments */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Competency Assessments</p>
                <Button type="button" size="sm" variant="outline"
                  onClick={() => competencyFields.append({ area: "", date: "", passed: false })}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Add Assessment
                </Button>
              </div>
              {competencyFields.fields.map((field, i) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <FormField control={form.control} name={`competencyAssessments.${i}.passed`} render={({ field }) => (
                    <FormItem className="space-y-0 mt-2.5">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <FormField control={form.control} name={`competencyAssessments.${i}.area`} render={({ field }) => (
                      <FormItem>
                        <FormControl><Input {...field} placeholder="Competency area…" /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`competencyAssessments.${i}.date`} render={({ field }) => (
                      <FormItem>
                        <FormControl><Input type="date" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9 mt-0 shrink-0"
                    onClick={() => competencyFields.remove(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : editing ? "Save Changes" : "Start Induction"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Summary ──────────────────────────────────────────────────────────────────

function InductionSummary({ record, onEdit }: { record: InductionRecord; onEdit: () => void }) {
  const competencies = (record.competencyAssessments as CompetencyAssessment[] | null) ?? [];
  const checklist = (record.checklistItems as ChecklistItem[] | null) ?? [];
  const completedChecklist = checklist.filter((c) => c.completed).length;
  const passedCompetencies = competencies.filter((c) => c.passed).length;
  const isComplete = !!record.inductionCompleted;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Induction Record
            <Badge variant="secondary" className={isComplete
              ? "text-green-700 bg-green-50 border-green-200"
              : "text-amber-700 bg-amber-50 border-amber-200"}>
              {isComplete ? "Complete" : "In Progress"}
            </Badge>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1" />Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <p><span className="text-muted-foreground">Started: </span>
              <strong>{formatDate(record.inductionStarted)}</strong></p>
            <p><span className="text-muted-foreground">Completed: </span>
              <strong>{formatDate(record.inductionCompleted)}</strong></p>
            <p><span className="text-muted-foreground">Mentor: </span>
              {record.mentor
                ? `${record.mentor.firstName} ${record.mentor.lastName}`
                : "—"}</p>
            <p><span className="text-muted-foreground">Shadow Shifts: </span>
              <strong>{record.shadowShiftsCompleted}</strong></p>
          </div>
          {record.probationReviewNotes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Probation Review Notes</p>
              <p className="text-sm whitespace-pre-wrap">{record.probationReviewNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {checklist.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Induction Checklist
              <span className="text-muted-foreground font-normal ml-2">
                {completedChecklist}/{checklist.length} completed
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {checklist.map((c, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Checkbox checked={c.completed} disabled className="shrink-0" />
                <span className={c.completed ? "line-through text-muted-foreground" : ""}>{c.item}</span>
                {c.date && (
                  <span className="text-xs text-muted-foreground ml-auto">{c.date}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {competencies.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Competency Assessments
              <span className="text-muted-foreground font-normal ml-2">
                {passedCompetencies}/{competencies.length} passed
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {competencies.map((c, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                {c.passed
                  ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                <span className={c.passed ? "text-muted-foreground" : ""}>{c.area}</span>
                {c.date && (
                  <span className="text-xs text-muted-foreground ml-auto">{c.date}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function StaffInductionPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [open, setOpen] = useState(false);

  const { data: induction, refetch } = trpc.staff.induction.getByStaff.useQuery({
    staffMemberId: id,
  });

  return (
    <div className="space-y-4">
      {induction ? (
        <InductionSummary
          record={induction as InductionRecord}
          onEdit={() => setOpen(true)}
        />
      ) : (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <GraduationCap className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No induction record</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Start the induction process to track orientation, shadow shifts, competency assessments, and checklist progress.
            </p>
            <Button className="mt-2" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Start Induction
            </Button>
          </CardContent>
        </Card>
      )}

      <InductionDialog
        open={open}
        onClose={() => setOpen(false)}
        staffMemberId={id}
        editing={induction as InductionRecord | null}
        onSuccess={refetch}
      />
    </div>
  );
}

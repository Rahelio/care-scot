"use client";

import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Heart,
  Plus,
  Pencil,
  CheckCircle2,
  XCircle,
  Syringe,
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

// ── Types ────────────────────────────────────────────────────────────────────

type Immunisations = {
  hepatitisB?: string;
  covid?: string;
  flu?: string;
};

type HealthDeclaration = {
  id: string;
  declarationDate: Date;
  fitToWork: boolean;
  ohAssessmentRequired: boolean;
  ohAssessmentDate: Date | null;
  immunisations: Immunisations | null;
  fitnessToWorkDate: Date | null;
  notes: string | null;
  createdAt: Date;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
}

// ── Health Declaration Dialog ─────────────────────────────────────────────────

const healthSchema = z.object({
  declarationDate: z.string().min(1, "Declaration date is required"),
  fitToWork: z.boolean(),
  ohAssessmentRequired: z.boolean(),
  ohAssessmentDate: z.string().optional(),
  hepatitisB: z.string().optional(),
  covid: z.string().optional(),
  flu: z.string().optional(),
  fitnessToWorkDate: z.string().optional(),
  notes: z.string().optional(),
});

type HealthForm = z.infer<typeof healthSchema>;

function HealthDialog({
  open,
  onClose,
  staffMemberId,
  editing,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  staffMemberId: string;
  editing: HealthDeclaration | null;
  onSuccess: () => void;
}) {
  const immunisations = editing?.immunisations as Immunisations | null | undefined;

  const form = useForm<HealthForm>({
    resolver: zodResolver(healthSchema),
    defaultValues: {
      declarationDate: editing?.declarationDate
        ? new Date(editing.declarationDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      fitToWork: editing?.fitToWork ?? true,
      ohAssessmentRequired: editing?.ohAssessmentRequired ?? false,
      ohAssessmentDate: editing?.ohAssessmentDate
        ? new Date(editing.ohAssessmentDate).toISOString().split("T")[0]
        : "",
      hepatitisB: immunisations?.hepatitisB ?? "",
      covid: immunisations?.covid ?? "",
      flu: immunisations?.flu ?? "",
      fitnessToWorkDate: editing?.fitnessToWorkDate
        ? new Date(editing.fitnessToWorkDate).toISOString().split("T")[0]
        : "",
      notes: editing?.notes ?? "",
    },
  });

  const ohRequired = form.watch("ohAssessmentRequired");

  const createMutation = trpc.staff.health.create.useMutation({
    onSuccess: () => { toast.success("Health declaration saved"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.staff.health.update.useMutation({
    onSuccess: () => { toast.success("Health declaration updated"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  function onSubmit(values: HealthForm) {
    const immPayload: Immunisations = {};
    if (values.hepatitisB) immPayload.hepatitisB = values.hepatitisB;
    if (values.covid) immPayload.covid = values.covid;
    if (values.flu) immPayload.flu = values.flu;

    const payload = {
      declarationDate: new Date(values.declarationDate),
      fitToWork: values.fitToWork,
      ohAssessmentRequired: values.ohAssessmentRequired,
      ohAssessmentDate: values.ohAssessmentDate ? new Date(values.ohAssessmentDate) : undefined,
      immunisations: Object.keys(immPayload).length > 0 ? immPayload : undefined,
      fitnessToWorkDate: values.fitnessToWorkDate ? new Date(values.fitnessToWorkDate) : undefined,
      notes: values.notes || undefined,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload });
    } else {
      createMutation.mutate({ staffMemberId, ...payload });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Health Declaration" : "New Health Declaration"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Declaration Date */}
            <FormField
              control={form.control}
              name="declarationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Declaration Date <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fit to Work */}
            <FormField
              control={form.control}
              name="fitToWork"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-md border p-3">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel className="font-medium">Fit to Work</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Staff member has declared they are medically fit to carry out their duties
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {/* RTW Fitness Date */}
            <FormField
              control={form.control}
              name="fitnessToWorkDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Return to Work Fitness Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* OH Assessment */}
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="ohAssessmentRequired"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">Occupational Health Assessment Required</FormLabel>
                  </FormItem>
                )}
              />
              {ohRequired && (
                <FormField
                  control={form.control}
                  name="ohAssessmentDate"
                  render={({ field }) => (
                    <FormItem className="ml-7">
                      <FormLabel>OH Assessment Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <Separator />

            {/* Immunisations */}
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Syringe className="h-4 w-4" />
                Immunisations
              </p>
              <div className="grid grid-cols-1 gap-3 pl-1">
                <FormField
                  control={form.control}
                  name="hepatitisB"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal">Hepatitis B — date of last dose</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="covid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal">COVID-19 — date of last dose</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="flu"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal">Flu — date of last dose</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Any additional health notes or conditions…"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : editing ? "Save Changes" : "Save Declaration"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Declaration Card ──────────────────────────────────────────────────────────

function DeclarationCard({
  declaration,
  onEdit,
  isLatest,
}: {
  declaration: HealthDeclaration;
  onEdit: (d: HealthDeclaration) => void;
  isLatest: boolean;
}) {
  const immunisations = declaration.immunisations as Immunisations | null | undefined;

  return (
    <Card className={isLatest ? "border-primary/30" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            Declaration — {formatDate(declaration.declarationDate)}
          </span>
          {isLatest && (
            <Badge variant="secondary" className="text-xs">Latest</Badge>
          )}
          {declaration.fitToWork ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Fit to Work
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium">
              <XCircle className="h-3.5 w-3.5" />
              Not Fit to Work
            </span>
          )}
        </div>
        <Button size="icon" variant="ghost" onClick={() => onEdit(declaration)}>
          <Pencil className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {declaration.fitnessToWorkDate && (
            <p>
              <span className="text-muted-foreground">RTW Fitness Date: </span>
              {formatDate(declaration.fitnessToWorkDate)}
            </p>
          )}
          {declaration.ohAssessmentRequired && (
            <p>
              <span className="text-muted-foreground">OH Assessment: </span>
              {declaration.ohAssessmentDate
                ? formatDate(declaration.ohAssessmentDate)
                : "Required — date TBC"}
            </p>
          )}
        </div>

        {(immunisations?.hepatitisB || immunisations?.covid || immunisations?.flu) && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
              <Syringe className="h-3 w-3" />
              Immunisations
            </p>
            <div className="grid grid-cols-3 gap-3">
              {immunisations.hepatitisB && (
                <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <p className="text-xs text-muted-foreground mb-0.5">Hepatitis B</p>
                  <p className="font-medium">{immunisations.hepatitisB}</p>
                </div>
              )}
              {immunisations.covid && (
                <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <p className="text-xs text-muted-foreground mb-0.5">COVID-19</p>
                  <p className="font-medium">{immunisations.covid}</p>
                </div>
              )}
              {immunisations.flu && (
                <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <p className="text-xs text-muted-foreground mb-0.5">Flu</p>
                  <p className="font-medium">{immunisations.flu}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {declaration.notes && (
          <p className="text-sm text-muted-foreground border-l-2 pl-3 italic">
            {declaration.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function StaffHealthPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HealthDeclaration | null>(null);

  const { data: declarations = [], refetch } = trpc.staff.health.getByStaff.useQuery({
    staffMemberId: id,
  });

  function handleEdit(d: HealthDeclaration) {
    setEditing(d);
    setOpen(true);
  }

  function handleAdd() {
    setEditing(null);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4" />
            Health Declarations
          </CardTitle>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            New Declaration
          </Button>
        </CardHeader>
        <CardContent>
          {declarations.length === 0 ? (
            <div className="py-10 text-center">
              <Heart className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-sm">No health declarations on file</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                Record health declarations, fitness to work status, OH assessments, and immunisation dates.
              </p>
              <Button className="mt-4" size="sm" onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-1" />
                Add First Declaration
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {declarations.map((d, i) => (
                <DeclarationCard
                  key={d.id}
                  declaration={d as HealthDeclaration}
                  onEdit={handleEdit}
                  isLatest={i === 0}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <HealthDialog
        open={open}
        onClose={() => setOpen(false)}
        staffMemberId={id}
        editing={editing}
        onSuccess={refetch}
      />
    </div>
  );
}

"use client";

import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  GraduationCap,
  Plus,
  Pencil,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  TRAINING_LABELS,
  computeTrainingStatus,
  type TrainingStatus,
} from "@/server/services/staff/training-config";

// ── Types ────────────────────────────────────────────────────────────────────

type TrainingRecord = {
  id: string;
  trainingType: string;
  trainingName: string;
  trainingProvider: string | null;
  completionDate: Date;
  expiryDate: Date | null;
  isMandatory: boolean;
};

const ALL_TRAINING_TYPES = Object.keys(TRAINING_LABELS) as Array<keyof typeof TRAINING_LABELS>;

// ── Status helpers ────────────────────────────────────────────────────────────

function statusForType(
  records: TrainingRecord[],
  type: string
): TrainingStatus {
  const matches = records.filter((r) => r.trainingType === type);
  if (matches.length === 0) return "missing";
  return computeTrainingStatus(matches[0].expiryDate);
}

function StatusBadge({ status }: { status: TrainingStatus }) {
  if (status === "up_to_date")
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Up to date
      </Badge>
    );
  if (status === "expiring")
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 gap-1">
        <Clock className="h-3 w-3" />
        Expiring soon
      </Badge>
    );
  if (status === "expired")
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Expired
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-muted-foreground gap-1">
      Missing
    </Badge>
  );
}

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
}

// ── Add / Edit dialog ─────────────────────────────────────────────────────────

const trainingSchema = z.object({
  trainingType: z.string().min(1, "Training type is required"),
  trainingName: z.string().min(1, "Training name is required"),
  trainingProvider: z.string().optional(),
  completionDate: z.string().min(1, "Completion date is required"),
  expiryDate: z.string().optional(),
  isMandatory: z.boolean(),
});

type TrainingForm = z.infer<typeof trainingSchema>;

function TrainingDialog({
  open,
  onClose,
  staffMemberId,
  editing,
  prefillType,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  staffMemberId: string;
  editing: TrainingRecord | null;
  prefillType?: string;
  onSuccess: () => void;
}) {
  const form = useForm<TrainingForm>({
    resolver: zodResolver(trainingSchema),
    defaultValues: {
      trainingType: editing?.trainingType ?? prefillType ?? "",
      trainingName:
        editing?.trainingName ??
        (prefillType ? (TRAINING_LABELS[prefillType as keyof typeof TRAINING_LABELS] ?? "") : ""),
      trainingProvider: editing?.trainingProvider ?? "",
      completionDate: editing?.completionDate
        ? new Date(editing.completionDate).toISOString().split("T")[0]
        : "",
      expiryDate: editing?.expiryDate
        ? new Date(editing.expiryDate).toISOString().split("T")[0]
        : "",
      isMandatory: editing?.isMandatory ?? false,
    },
  });

  // Auto-fill training name when type changes (if name is empty / matches old label)
  function onTypeChange(type: string) {
    form.setValue("trainingType", type);
    const label = TRAINING_LABELS[type as keyof typeof TRAINING_LABELS];
    if (label && (!form.getValues("trainingName") || ALL_TRAINING_TYPES.includes(form.getValues("trainingName") as keyof typeof TRAINING_LABELS))) {
      form.setValue("trainingName", label);
    }
  }

  const createMutation = trpc.staff.training.create.useMutation({
    onSuccess: () => { toast.success("Training record added"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.staff.training.update.useMutation({
    onSuccess: () => { toast.success("Training record updated"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  function onSubmit(values: TrainingForm) {
    const payload = {
      trainingType: values.trainingType as never,
      trainingName: values.trainingName,
      trainingProvider: values.trainingProvider || undefined,
      completionDate: new Date(values.completionDate),
      expiryDate: values.expiryDate ? new Date(values.expiryDate) : undefined,
      isMandatory: values.isMandatory,
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Training Record" : "Add Training Record"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="trainingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Training Type <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={onTypeChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ALL_TRAINING_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{TRAINING_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="trainingName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Training Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Fire Safety Awareness" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="trainingProvider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Training Provider</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Skills for Care" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="completionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Completion Date <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="isMandatory"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">Mandatory for this role</FormLabel>
                </FormItem>
              )}
            />
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

// ── Page ─────────────────────────────────────────────────────────────────────

export default function StaffTrainingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingRecord | null>(null);
  const [prefillType, setPrefillType] = useState<string | undefined>();

  const { data, refetch } = trpc.staff.training.getByStaff.useQuery({ staffMemberId: id });
  const records: TrainingRecord[] = (data?.records ?? []) as TrainingRecord[];
  const mandatory: string[] = data?.mandatory ?? [];

  const missingMandatory = mandatory.filter(
    (type) => statusForType(records, type) === "missing"
  );
  const problemMandatory = mandatory.filter((type) => {
    const s = statusForType(records, type);
    return s === "expired" || s === "expiring";
  });

  function openAdd(type?: string) {
    setEditing(null);
    setPrefillType(type);
    setOpen(true);
  }

  function openEdit(record: TrainingRecord) {
    setEditing(record);
    setPrefillType(undefined);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Mandatory training status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-4 w-4" />
            Mandatory Training
          </CardTitle>
          <Button size="sm" onClick={() => openAdd()}>
            <Plus className="h-4 w-4 mr-1" />
            Add Training
          </Button>
        </CardHeader>
        <CardContent>
          {mandatory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No mandatory training defined for this role.
            </p>
          ) : (
            <>
              {(missingMandatory.length > 0 || problemMandatory.length > 0) && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 mb-4">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    {missingMandatory.length > 0 &&
                      `${missingMandatory.length} mandatory training item${missingMandatory.length > 1 ? "s" : ""} missing. `}
                    {problemMandatory.length > 0 &&
                      `${problemMandatory.length} item${problemMandatory.length > 1 ? "s" : ""} expired or expiring.`}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {mandatory.map((type) => {
                  const status = statusForType(records, type);
                  const latest = records.find((r) => r.trainingType === type);
                  return (
                    <div
                      key={type}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {TRAINING_LABELS[type as keyof typeof TRAINING_LABELS] ?? type}
                        </p>
                        {latest && (
                          <p className="text-xs text-muted-foreground">
                            Completed {formatDate(latest.completionDate)}
                            {latest.expiryDate ? ` · Expires ${formatDate(latest.expiryDate)}` : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusBadge status={status} />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() =>
                            latest ? openEdit(latest as TrainingRecord) : openAdd(type)
                          }
                        >
                          {latest ? (
                            <Pencil className="h-3.5 w-3.5" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Full training history */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">All Training Records</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No training records on file.
            </p>
          ) : (
            <div className="divide-y">
              {records.map((r) => {
                const status = computeTrainingStatus(r.expiryDate);
                return (
                  <div
                    key={r.id}
                    className="py-3 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{r.trainingName}</span>
                        {r.isMandatory && (
                          <Badge variant="outline" className="text-xs">Mandatory</Badge>
                        )}
                        <StatusBadge status={status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {TRAINING_LABELS[r.trainingType as keyof typeof TRAINING_LABELS] ?? r.trainingType}
                        {r.trainingProvider ? ` · ${r.trainingProvider}` : ""}
                        {" · "}Completed {formatDate(r.completionDate)}
                        {r.expiryDate ? ` · Expires ${formatDate(r.expiryDate)}` : ""}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <TrainingDialog
        open={open}
        onClose={() => setOpen(false)}
        staffMemberId={id}
        editing={editing}
        prefillType={prefillType}
        onSuccess={refetch}
      />
    </div>
  );
}

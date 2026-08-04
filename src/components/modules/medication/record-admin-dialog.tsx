"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

type ExistingRecord = {
  id: string;
  administered: boolean;
  refused: boolean;
  notAvailable: boolean;
  administeredAt: Date | null;
  doseGiven: string | null;
  refusedReason: string | null;
  notAvailableReason: string | null;
  prnReasonGiven: string | null;
  outcomeNotes: string | null;
  scheduledTime: string;
  administeredByStaff: { firstName: string; lastName: string } | null;
  witness: { firstName: string; lastName: string } | null;
  voidedAt: Date | string | null;
  voidReason: string | null;
  voidedByUser: { email: string } | null;
};

type Medication = {
  id: string;
  medicationName: string;
  dose: string | null;
  isPrn: boolean;
  isControlledDrug: boolean;
  prnReason: string | null;
};

interface RecordAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceUserId: string;
  medication: Medication | null;
  date: string; // "YYYY-MM-DD"
  existingRecords: ExistingRecord[];
  onSuccess: () => void;
}

const baseSchema = z.object({
  outcome: z.string().min(1, "Required"), // "administered" | "refused" | "not_available"
  scheduledTime: z.string().min(1, "Required"),
  doseGiven: z.string().optional(),
  refusedReason: z.string().optional(),
  notAvailableReason: z.string().optional(),
  prnReasonGiven: z.string().optional(),
  outcomeNotes: z.string().optional(),
  witnessId: z.string().optional(),
});

type FormValues = z.infer<typeof baseSchema>;

// Mirrors the server-side requirements in medication.ts's marRecord mutation
// (witness for controlled drugs, reason for PRN) so the user sees inline
// validation instead of only finding out after a round-trip to the server.
function buildSchema(isControlledDrug: boolean, isPrn: boolean) {
  return baseSchema.superRefine((values, ctx) => {
    if (values.outcome !== "administered") return;
    if (isControlledDrug && !values.witnessId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["witnessId"],
        message: "A witness is required for controlled drug administration",
      });
    }
    if (isPrn && !values.prnReasonGiven) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prnReasonGiven"],
        message: "A reason is required for PRN administrations",
      });
    }
  });
}

export function RecordAdminDialog({
  open,
  onOpenChange,
  serviceUserId,
  medication,
  date,
  existingRecords,
  onSuccess,
}: RecordAdminDialogProps) {
  const utils = trpc.useUtils();
  const { data: session } = useSession();
  const canVoid = session?.user?.role
    ? ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"].includes(session.user.role)
    : false;

  const { data: staffList } = trpc.medication.listStaffForWitness.useQuery(undefined, {
    enabled: open && !!medication?.isControlledDrug,
  });

  // A mis-tap here submits a permanent clinical record — "administered"
  // (and its controlled-drug case especially) gets a confirmation step
  // before the mutation fires. Refused/not-available are lower-stakes (no
  // substance was actually given) and submit directly.
  const [pendingSubmit, setPendingSubmit] = useState<FormValues | null>(null);

  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReasonInput, setVoidReasonInput] = useState("");

  const schema = useMemo(
    () => buildSchema(medication?.isControlledDrug ?? false, medication?.isPrn ?? false),
    [medication?.isControlledDrug, medication?.isPrn],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      outcome: "administered",
      scheduledTime: new Date().toTimeString().slice(0, 5),
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        outcome: "administered",
        scheduledTime: new Date().toTimeString().slice(0, 5),
        doseGiven: medication?.dose ?? undefined,
      });
      setPendingSubmit(null);
      setVoidingId(null);
      setVoidReasonInput("");
    }
  }, [open, medication, form]);

  const mutation = trpc.medication.marRecord.useMutation({
    onSuccess: () => {
      toast.success("Administration recorded");
      utils.medication.getMarByMonth.invalidate();
      onOpenChange(false);
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const voidMutation = trpc.medication.voidAdminRecord.useMutation({
    onSuccess: () => {
      toast.success("Entry voided");
      utils.medication.getMarByMonth.invalidate();
      setVoidingId(null);
      setVoidReasonInput("");
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const outcome = form.watch("outcome");

  function submitRecord(values: FormValues) {
    if (!medication) return;
    mutation.mutate({
      serviceUserId,
      medicationId: medication.id,
      scheduledDate: date,
      scheduledTime: values.scheduledTime,
      administered: values.outcome === "administered",
      doseGiven: values.outcome === "administered" ? values.doseGiven : undefined,
      refused: values.outcome === "refused",
      refusedReason: values.outcome === "refused" ? values.refusedReason : undefined,
      notAvailable: values.outcome === "not_available",
      notAvailableReason:
        values.outcome === "not_available" ? values.notAvailableReason : undefined,
      prnReasonGiven: values.prnReasonGiven,
      outcomeNotes: values.outcomeNotes,
      witnessId: values.witnessId || undefined,
    });
  }

  function onSubmit(values: FormValues) {
    if (values.outcome === "administered") {
      setPendingSubmit(values);
      return;
    }
    submitRecord(values);
  }

  if (!medication) return null;

  const hasExisting = existingRecords.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {medication.medicationName}
            {medication.isPrn && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">PRN</Badge>
            )}
            {medication.isControlledDrug && (
              <Badge className="bg-red-100 text-red-800 border-red-200">CD</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {formatDate(date)}
            {medication.dose && ` · ${medication.dose}`}
            {medication.prnReason && ` · Indication: ${medication.prnReason}`}
          </DialogDescription>
        </DialogHeader>

        {/* Existing records for this day */}
        {hasExisting && (
          <div className="space-y-2 rounded-md border bg-muted/40 p-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Already recorded today
            </p>
            {existingRecords.map((r) => (
              <div key={r.id} className="text-sm space-y-1">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 font-mono text-xs text-muted-foreground mt-0.5">
                    {r.scheduledTime}
                  </span>
                  {r.voidedAt ? (
                    <div className="text-muted-foreground line-through decoration-destructive/60">
                      {r.administered && `Given${r.doseGiven ? ` — ${r.doseGiven}` : ""}`}
                      {r.refused && `Refused${r.refusedReason ? ` — ${r.refusedReason}` : ""}`}
                      {r.notAvailable &&
                        `Not available${r.notAvailableReason ? ` — ${r.notAvailableReason}` : ""}`}
                    </div>
                  ) : (
                    <div className="flex-1">
                      {r.administered && (
                        <span className="text-green-700 font-medium">
                          Given{r.doseGiven ? ` — ${r.doseGiven}` : ""}
                        </span>
                      )}
                      {r.refused && (
                        <span className="text-red-700 font-medium">
                          Refused{r.refusedReason ? ` — ${r.refusedReason}` : ""}
                        </span>
                      )}
                      {r.notAvailable && (
                        <span className="text-orange-700 font-medium">
                          Not available{r.notAvailableReason ? ` — ${r.notAvailableReason}` : ""}
                        </span>
                      )}
                      {r.administeredByStaff && (
                        <span className="text-muted-foreground">
                          {" "}
                          by {r.administeredByStaff.firstName} {r.administeredByStaff.lastName}
                        </span>
                      )}
                    </div>
                  )}
                  {canVoid && !r.voidedAt && voidingId !== r.id && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => {
                        setVoidingId(r.id);
                        setVoidReasonInput("");
                      }}
                    >
                      Void
                    </Button>
                  )}
                </div>

                {r.voidedAt && (
                  <p className="text-xs text-destructive pl-[3.25rem]">
                    Voided{r.voidedByUser ? ` by ${r.voidedByUser.email}` : ""}
                    {r.voidReason ? ` — ${r.voidReason}` : ""}
                  </p>
                )}

                {voidingId === r.id && (
                  <div className="pl-[3.25rem] space-y-2">
                    <Textarea
                      value={voidReasonInput}
                      onChange={(e) => setVoidReasonInput(e.target.value)}
                      placeholder="Why is this entry being voided? (e.g. wrong client, wrong outcome selected)"
                      rows={2}
                      className="text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={!voidReasonInput.trim() || voidMutation.isPending}
                        onClick={() => voidMutation.mutate({ id: r.id, reason: voidReasonInput.trim() })}
                      >
                        {voidMutation.isPending ? "Voiding…" : "Confirm void"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setVoidingId(null);
                          setVoidReasonInput("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {pendingSubmit ? (
          <div className="space-y-4">
            <div className="rounded-md border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-4 space-y-1">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Confirm administration
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {medication.medicationName}
                {pendingSubmit.doseGiven ? ` — ${pendingSubmit.doseGiven}` : medication.dose ? ` — ${medication.dose}` : ""}
                {" "}at {pendingSubmit.scheduledTime}. This creates a permanent record.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setPendingSubmit(null)} disabled={mutation.isPending}>
                Back
              </Button>
              <Button type="button" onClick={() => submitRecord(pendingSubmit)} disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Confirm"}
              </Button>
            </div>
          </div>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <p className="text-sm font-medium">
              {hasExisting ? "Add another record" : "Record administration"}
            </p>

            <FormField
              control={form.control}
              name="outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outcome *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="administered">Administered</SelectItem>
                      <SelectItem value="refused">Refused by service user</SelectItem>
                      <SelectItem value="not_available">Not available</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scheduledTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time *</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {outcome === "administered" && (
              <FormField
                control={form.control}
                name="doseGiven"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dose Given</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder={medication.dose ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {outcome === "refused" && (
              <FormField
                control={form.control}
                name="refusedReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Refusal</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {outcome === "not_available" && (
              <FormField
                control={form.control}
                name="notAvailableReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason Not Available</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="e.g. Out of stock, on order" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {medication.isPrn && outcome === "administered" && (
              <FormField
                control={form.control}
                name="prnReasonGiven"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      PRN Reason Given{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder={medication.prnReason ?? "Why was this PRN given?"}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {medication.isControlledDrug && outcome === "administered" && (
              <FormField
                control={form.control}
                name="witnessId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Witness (Controlled Drug){" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select witness…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(staffList ?? []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.firstName} {s.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="outcomeNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Record"}
              </Button>
            </div>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

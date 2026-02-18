"use client";

import { use, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { LogOut, Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";

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

type EquipmentItem = { item: string; returned: boolean; returnDate?: string };

type LeavingRecord = {
  id: string;
  leavingDate: Date;
  reason: string;
  exitInterviewNotes: string | null;
  equipmentReturned: unknown;
  finalPayProcessed: boolean;
  referenceProvided: boolean;
};

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
}

const LEAVING_REASON_LABELS: Record<string, string> = {
  RESIGNED: "Resigned",
  DISMISSED: "Dismissed",
  REDUNDANCY: "Redundancy",
  END_OF_CONTRACT: "End of Contract",
  RETIRED: "Retired",
  OTHER: "Other",
};

// ── Leaving form / dialog ─────────────────────────────────────────────────────

const leavingSchema = z.object({
  leavingDate: z.string().min(1, "Leaving date is required"),
  reason: z.enum(["RESIGNED", "DISMISSED", "REDUNDANCY", "END_OF_CONTRACT", "RETIRED", "OTHER"]),
  exitInterviewNotes: z.string().optional(),
  finalPayProcessed: z.boolean(),
  referenceProvided: z.boolean(),
  equipmentItems: z.array(
    z.object({
      item: z.string(),
      returned: z.boolean(),
      returnDate: z.string().optional(),
    })
  ),
});

type LeavingForm = z.infer<typeof leavingSchema>;

function LeavingDialog({
  open, onClose, staffMemberId, editing, onSuccess,
}: {
  open: boolean; onClose: () => void; staffMemberId: string;
  editing: LeavingRecord | null; onSuccess: () => void;
}) {
  const existingEquipment = (editing?.equipmentReturned as EquipmentItem[] | null) ?? [];

  const form = useForm<LeavingForm>({
    resolver: zodResolver(leavingSchema),
    defaultValues: {
      leavingDate: editing?.leavingDate
        ? new Date(editing.leavingDate).toISOString().split("T")[0] : "",
      reason: (editing?.reason as LeavingForm["reason"]) ?? "RESIGNED",
      exitInterviewNotes: editing?.exitInterviewNotes ?? "",
      finalPayProcessed: editing?.finalPayProcessed ?? false,
      referenceProvided: editing?.referenceProvided ?? false,
      equipmentItems: existingEquipment.map((e) => ({
        item: e.item, returned: e.returned, returnDate: e.returnDate ?? "",
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "equipmentItems",
  });

  const createMut = trpc.staff.leaving.create.useMutation({
    onSuccess: () => { toast.success("Leaving record created — status set to Left"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.staff.leaving.update.useMutation({
    onSuccess: () => { toast.success("Leaving record updated"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  function onSubmit(v: LeavingForm) {
    const equipment = v.equipmentItems
      .filter((e) => e.item.trim())
      .map((e) => ({ item: e.item, returned: e.returned, returnDate: e.returnDate || undefined }));

    const payload = {
      leavingDate: new Date(v.leavingDate),
      reason: v.reason as never,
      exitInterviewNotes: v.exitInterviewNotes || undefined,
      finalPayProcessed: v.finalPayProcessed,
      referenceProvided: v.referenceProvided,
      equipmentReturned: equipment.length > 0 ? equipment : undefined,
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
          <DialogTitle>{editing ? "Edit Leaving Record" : "Initiate Leaving Process"}</DialogTitle>
        </DialogHeader>
        {!editing && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This will set the staff member&apos;s status to <strong>Left</strong> and record their leaving date.
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="leavingDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Leaving Date <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(LEAVING_REASON_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="exitInterviewNotes" render={({ field }) => (
              <FormItem>
                <FormLabel>Exit Interview Notes</FormLabel>
                <FormControl><Textarea {...field} rows={3} placeholder="Exit interview summary…" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Separator />

            {/* Equipment checklist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Equipment Checklist</p>
                <Button type="button" size="sm" variant="outline"
                  onClick={() => append({ item: "", returned: false, returnDate: "" })}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Add Item
                </Button>
              </div>
              {fields.map((f, i) => (
                <div key={f.id} className="flex gap-2 items-start">
                  <FormField control={form.control} name={`equipmentItems.${i}.returned`} render={({ field }) => (
                    <FormItem className="space-y-0 mt-2.5">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <FormField control={form.control} name={`equipmentItems.${i}.item`} render={({ field }) => (
                      <FormItem>
                        <FormControl><Input {...field} placeholder="Item (e.g. Uniform)" /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`equipmentItems.${i}.returnDate`} render={({ field }) => (
                      <FormItem>
                        <FormControl><Input type="date" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9 mt-0 shrink-0"
                    onClick={() => remove(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <Separator />

            {/* Final checklist */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Final Steps</p>
              <FormField control={form.control} name="finalPayProcessed" render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">Final pay processed</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="referenceProvided" render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">Reference provided</FormLabel>
                </FormItem>
              )} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isPending} variant={editing ? "default" : "destructive"}>
                {isPending ? "Saving…" : editing ? "Save Changes" : "Confirm Leaving"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Leaving summary view ──────────────────────────────────────────────────────

function LeavingSummary({ record, onEdit }: { record: LeavingRecord; onEdit: () => void }) {
  const equipment = (record.equipmentReturned as EquipmentItem[] | null) ?? [];
  const returnedCount = equipment.filter((e) => e.returned).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Leaving Details
          </CardTitle>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1" />Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <p><span className="text-muted-foreground">Leaving Date: </span>
              <strong>{formatDate(record.leavingDate)}</strong></p>
            <p><span className="text-muted-foreground">Reason: </span>
              {LEAVING_REASON_LABELS[record.reason] ?? record.reason}</p>
          </div>
          <div className="flex gap-3">
            <Badge variant={record.finalPayProcessed ? "secondary" : "outline"}
              className={record.finalPayProcessed ? "text-green-700 bg-green-50 border-green-200" : ""}>
              {record.finalPayProcessed ? <CheckCircle2 className="h-3 w-3 mr-1" /> : null}
              Final Pay
            </Badge>
            <Badge variant={record.referenceProvided ? "secondary" : "outline"}
              className={record.referenceProvided ? "text-green-700 bg-green-50 border-green-200" : ""}>
              {record.referenceProvided ? <CheckCircle2 className="h-3 w-3 mr-1" /> : null}
              Reference
            </Badge>
          </div>
          {record.exitInterviewNotes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Exit Interview Notes</p>
              <p className="text-sm whitespace-pre-wrap">{record.exitInterviewNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {equipment.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Equipment Checklist
              <span className="text-muted-foreground font-normal ml-2">
                {returnedCount}/{equipment.length} returned
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {equipment.map((e, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Checkbox checked={e.returned} disabled className="shrink-0" />
                <span className={e.returned ? "line-through text-muted-foreground" : ""}>{e.item}</span>
                {e.returned && e.returnDate && (
                  <span className="text-xs text-muted-foreground ml-auto">{e.returnDate}</span>
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

export default function StaffLeavingPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [open, setOpen] = useState(false);

  const { data: leaving, refetch } = trpc.staff.leaving.getByStaff.useQuery({
    staffMemberId: id,
  });

  return (
    <div className="space-y-4">
      {leaving ? (
        <LeavingSummary
          record={leaving as LeavingRecord}
          onEdit={() => setOpen(true)}
        />
      ) : (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <LogOut className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No leaving record</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              When this staff member leaves, initiate the leaving process to record their exit date, reason, and complete the equipment checklist.
            </p>
            <Button className="mt-2" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Initiate Leaving Process
            </Button>
          </CardContent>
        </Card>
      )}

      <LeavingDialog
        open={open}
        onClose={() => setOpen(false)}
        staffMemberId={id}
        editing={leaving as LeavingRecord | null}
        onSuccess={refetch}
      />
    </div>
  );
}

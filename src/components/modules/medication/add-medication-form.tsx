"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/components/ui/dialog";

const FORM_OPTIONS = [
  { value: "TABLET", label: "Tablet" },
  { value: "LIQUID", label: "Liquid" },
  { value: "INJECTION", label: "Injection" },
  { value: "TOPICAL", label: "Topical" },
  { value: "PATCH", label: "Patch" },
  { value: "INHALER", label: "Inhaler" },
  { value: "DROPS", label: "Drops" },
  { value: "SUPPOSITORY", label: "Suppository" },
  { value: "OTHER", label: "Other" },
];

const schema = z.object({
  medicationName: z.string().min(1, "Required"),
  form: z.string().optional(),
  dose: z.string().optional(),
  frequency: z.string().optional(),
  route: z.string().optional(),
  prescriber: z.string().optional(),
  pharmacy: z.string().optional(),
  startDate: z.string().min(1, "Required"),
  endDate: z.string().optional(),
  isPrn: z.boolean(),
  prnReason: z.string().optional(),
  prnMaxDose: z.string().optional(),
  isControlledDrug: z.boolean(),
  specialInstructions: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Medication = {
  id: string;
  medicationName: string;
  form: string | null;
  dose: string | null;
  frequency: string | null;
  route: string | null;
  prescriber: string | null;
  pharmacy: string | null;
  startDate: Date;
  endDate: Date | null;
  isPrn: boolean;
  prnReason: string | null;
  prnMaxDose: string | null;
  isControlledDrug: boolean;
  specialInstructions: string | null;
};

interface AddMedicationFormProps {
  serviceUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editMedication?: Medication;
}

export function AddMedicationForm({
  serviceUserId,
  open,
  onOpenChange,
  onSuccess,
  editMedication,
}: AddMedicationFormProps) {
  const utils = trpc.useUtils();
  const isEdit = !!editMedication;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      medicationName: "",
      startDate: new Date().toISOString().split("T")[0],
      isPrn: false,
      isControlledDrug: false,
    },
  });

  useEffect(() => {
    if (open) {
      if (editMedication) {
        form.reset({
          medicationName: editMedication.medicationName,
          form: editMedication.form ?? undefined,
          dose: editMedication.dose ?? undefined,
          frequency: editMedication.frequency ?? undefined,
          route: editMedication.route ?? undefined,
          prescriber: editMedication.prescriber ?? undefined,
          pharmacy: editMedication.pharmacy ?? undefined,
          startDate: editMedication.startDate.toISOString().split("T")[0],
          endDate: editMedication.endDate
            ? editMedication.endDate.toISOString().split("T")[0]
            : undefined,
          isPrn: editMedication.isPrn,
          prnReason: editMedication.prnReason ?? undefined,
          prnMaxDose: editMedication.prnMaxDose ?? undefined,
          isControlledDrug: editMedication.isControlledDrug,
          specialInstructions: editMedication.specialInstructions ?? undefined,
        });
      } else {
        form.reset({
          medicationName: "",
          startDate: new Date().toISOString().split("T")[0],
          isPrn: false,
          isControlledDrug: false,
        });
      }
    }
  }, [open, editMedication, form]);

  const addMutation = trpc.medication.addMedication.useMutation({
    onSuccess: () => {
      toast.success("Medication added");
      utils.medication.listForClient.invalidate({ serviceUserId });
      onOpenChange(false);
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.medication.update.useMutation({
    onSuccess: () => {
      toast.success("Medication updated");
      utils.medication.listForClient.invalidate({ serviceUserId });
      onOpenChange(false);
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const isPending = addMutation.isPending || updateMutation.isPending;
  const isPrn = form.watch("isPrn");

  function onSubmit(values: FormValues) {
    if (isEdit && editMedication) {
      updateMutation.mutate({ id: editMedication.id, ...values });
    } else {
      addMutation.mutate({ serviceUserId, ...values });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Medication" : "Add Medication"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="medicationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medication Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Paracetamol" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="form"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Form</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FORM_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dose</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="e.g. 500mg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="e.g. TDS, BD, OD" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="route"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Route</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="e.g. Oral, IV" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="prescriber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prescriber</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="GP / Consultant" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pharmacy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pharmacy</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-6">
              <FormField
                control={form.control}
                name="isPrn"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">PRN (as required)</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isControlledDrug"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Controlled Drug</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {isPrn && (
              <div className="space-y-3 pl-4 border-l-2 border-blue-200">
                <FormField
                  control={form.control}
                  name="prnReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PRN Indication / Reason</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="e.g. Pain, Anxiety"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="prnMaxDose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Dose</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="e.g. 2g in 24 hours"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="specialInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      rows={2}
                      placeholder="Administration notes, storage requirements, etc."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : isEdit ? "Save Changes" : "Add Medication"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

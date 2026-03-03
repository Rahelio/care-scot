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
import type { HealthRecord } from "@prisma/client";

const RECORD_TYPES = [
  { value: "MEDICAL_HISTORY", label: "Medical History" },
  { value: "DIAGNOSIS", label: "Diagnosis" },
  { value: "ALLERGY", label: "Allergy" },
  { value: "GP_VISIT", label: "GP Visit" },
  { value: "HOSPITAL_ADMISSION", label: "Hospital Admission" },
  { value: "HOSPITAL_DISCHARGE", label: "Hospital Discharge" },
  { value: "HEALTHCARE_VISIT", label: "Healthcare Visit" },
  { value: "CONDITION_CHANGE", label: "Condition Change" },
];

const SEVERITY_OPTIONS = [
  { value: "MILD", label: "Mild" },
  { value: "MODERATE", label: "Moderate" },
  { value: "SEVERE", label: "Severe" },
  { value: "LIFE_THREATENING", label: "Life Threatening" },
];

const schema = z.object({
  recordType: z.string().min(1, "Required"),
  title: z.string().min(1, "Required"),
  description: z.string().optional(),
  severity: z.string().optional(),
  recordedDate: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof schema>;

interface HealthRecordFormProps {
  serviceUserId: string;
  initialRecordType?: string;
  record?: HealthRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function HealthRecordForm({
  serviceUserId,
  initialRecordType,
  record,
  open,
  onOpenChange,
  onSuccess,
}: HealthRecordFormProps) {
  const utils = trpc.useUtils();
  const isEditMode = !!record;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      recordType: initialRecordType ?? "",
      title: "",
      recordedDate: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    if (open) {
      if (record) {
        form.reset({
          recordType: record.recordType,
          title: record.title,
          description: record.description ?? "",
          severity: record.severity ?? "",
          recordedDate: new Date(record.recordedDate).toISOString().split("T")[0],
        });
      } else if (initialRecordType) {
        form.setValue("recordType", initialRecordType);
      }
    }
  }, [open, record, initialRecordType, form]);

  const createMut = trpc.clients.createHealthRecord.useMutation({
    onSuccess: () => {
      toast.success("Health record added");
      utils.clients.listHealthRecords.invalidate({ serviceUserId });
      form.reset();
      onOpenChange(false);
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMut = trpc.clients.updateHealthRecord.useMutation({
    onSuccess: () => {
      toast.success("Health record updated");
      utils.clients.listHealthRecords.invalidate({ serviceUserId });
      form.reset();
      onOpenChange(false);
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const recordType = form.watch("recordType");
  const showSeverity = recordType === "ALLERGY" || recordType === "DIAGNOSIS";
  const isPending = createMut.isPending || updateMut.isPending;

  function onSubmit(values: FormValues) {
    if (isEditMode && record) {
      updateMut.mutate({
        id: record.id,
        title: values.title,
        description: values.description || undefined,
        severity: values.severity || undefined,
        recordedDate: new Date(values.recordedDate),
      });
    } else {
      createMut.mutate({
        serviceUserId,
        ...values,
        recordedDate: new Date(values.recordedDate),
        severity: values.severity || undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Health Record" : "Add Health Record"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="recordType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Record Type *</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isEditMode}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RECORD_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
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
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Brief title or diagnosis name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recordedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {showSeverity && (
              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SEVERITY_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description / Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={3} />
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
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : isEditMode ? "Save Changes" : "Add Record"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

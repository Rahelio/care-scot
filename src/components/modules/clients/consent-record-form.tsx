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
  FormDescription,
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
import type { ConsentType } from "@prisma/client";

const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
  CARE_AND_SUPPORT: "Care and Support",
  INFORMATION_SHARING: "Information Sharing",
  MEDICATION: "Medication Administration",
  PHOTOGRAPHY: "Photography / Video",
  OTHER: "Other",
};

const schema = z.object({
  consentType: z.enum(["CARE_AND_SUPPORT", "INFORMATION_SHARING", "MEDICATION", "PHOTOGRAPHY", "OTHER"]),
  consentGiven: z.boolean(),
  capacityAssessed: z.boolean(),
  capacityOutcome: z.string().optional(),
  awiDocumentation: z.string().optional(),
  bestInterestDecision: z.string().optional(),
  signedBy: z.string().optional(),
  relationshipToServiceUser: z.string().optional(),
  consentDate: z.string().min(1, "Required"),
  reviewDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ConsentRecordFormProps {
  serviceUserId: string;
  initialConsentType?: ConsentType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ConsentRecordForm({
  serviceUserId,
  initialConsentType,
  open,
  onOpenChange,
  onSuccess,
}: ConsentRecordFormProps) {
  const utils = trpc.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      consentType: initialConsentType,
      consentGiven: true,
      capacityAssessed: false,
      consentDate: new Date().toISOString().split("T")[0],
    },
  });

  // Sync initialConsentType when dialog opens
  useEffect(() => {
    if (open && initialConsentType) {
      form.setValue("consentType", initialConsentType);
    }
  }, [open, initialConsentType, form]);

  const mutation = trpc.clients.createConsentRecord.useMutation({
    onSuccess: () => {
      toast.success("Consent record saved");
      utils.clients.listConsentRecords.invalidate({ serviceUserId });
      form.reset();
      onOpenChange(false);
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const capacityAssessed = form.watch("capacityAssessed");

  function onSubmit(values: FormValues) {
    mutation.mutate({
      serviceUserId,
      ...values,
      consentType: values.consentType as ConsentType,
      consentDate: new Date(values.consentDate),
      reviewDate: values.reviewDate ? new Date(values.reviewDate) : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Consent</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="consentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consent Type *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(CONSENT_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
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
              name="consentGiven"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel className="font-normal">Consent given</FormLabel>
                    <FormDescription>Uncheck if consent was withheld or withdrawn</FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="consentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consent Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reviewDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Review Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="signedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Signed By</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="Name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="relationshipToServiceUser"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="e.g. Self, Son" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="capacityAssessed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">Capacity was formally assessed</FormLabel>
                </FormItem>
              )}
            />

            {capacityAssessed && (
              <>
                <FormField
                  control={form.control}
                  name="capacityOutcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity Assessment Outcome</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ""} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="awiDocumentation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AWI Documentation Reference</FormLabel>
                      <FormDescription>
                        Adults with Incapacity (Scotland) Act documentation reference
                      </FormDescription>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bestInterestDecision"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Best Interest Decision</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ""} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

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
                {mutation.isPending ? "Saving…" : "Save Consent Record"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

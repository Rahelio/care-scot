"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  startDate: z.string().min(1, "Required"),
  endDate: z.string().optional(),
  servicesDescription: z.string().optional(),
  visitFrequency: z.string().optional(),
  visitDurationMinutes: z.string().optional(),
  costPerVisit: z.string().optional(),
  costPerHour: z.string().optional(),
  weeklyCost: z.string().optional(),
  paymentTerms: z.string().optional(),
  noticePeriodDays: z.string().optional(),
  signedByServiceUser: z.boolean(),
  signedByRepresentative: z.string().optional(),
  signedByProvider: z.boolean(),
  agreementDate: z.string().optional(),
  inspectionReportProvided: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function toNum(s: string | undefined): number | undefined {
  if (!s || s.trim() === "") return undefined;
  const n = parseFloat(s);
  return isNaN(n) ? undefined : n;
}

interface ServiceAgreementFormProps {
  serviceUserId: string;
  clientName: string;
  agreementId?: string;
  initialValues?: Partial<FormValues>;
}

export function ServiceAgreementForm({
  serviceUserId,
  clientName,
  agreementId,
  initialValues,
}: ServiceAgreementFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isEdit = Boolean(agreementId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      startDate: new Date().toISOString().split("T")[0],
      signedByServiceUser: false,
      signedByProvider: false,
      inspectionReportProvided: false,
      ...initialValues,
    },
  });

  const createMutation = trpc.clients.createServiceAgreement.useMutation({
    onSuccess: () => {
      toast.success("Service agreement saved");
      utils.clients.listServiceAgreements.invalidate({ serviceUserId });
      router.push(`/clients/${serviceUserId}/agreement`);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.clients.updateServiceAgreement.useMutation({
    onSuccess: () => {
      toast.success("Service agreement updated");
      utils.clients.listServiceAgreements.invalidate({ serviceUserId });
      router.push(`/clients/${serviceUserId}/agreement`);
    },
    onError: (err) => toast.error(err.message),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: FormValues) {
    const payload = {
      servicesDescription: values.servicesDescription,
      visitFrequency: values.visitFrequency,
      paymentTerms: values.paymentTerms,
      signedByServiceUser: values.signedByServiceUser,
      signedByRepresentative: values.signedByRepresentative,
      signedByProvider: values.signedByProvider,
      inspectionReportProvided: values.inspectionReportProvided,
      startDate: new Date(values.startDate),
      endDate: values.endDate ? new Date(values.endDate) : undefined,
      agreementDate: values.agreementDate ? new Date(values.agreementDate) : undefined,
      visitDurationMinutes: toNum(values.visitDurationMinutes),
      costPerVisit: toNum(values.costPerVisit),
      costPerHour: toNum(values.costPerHour),
      weeklyCost: toNum(values.weeklyCost),
      noticePeriodDays: toNum(values.noticePeriodDays),
    };

    if (isEdit && agreementId) {
      updateMutation.mutate({ id: agreementId, ...payload });
    } else {
      createMutation.mutate({ serviceUserId, ...payload });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit Service Agreement" : "Service Agreement"}
          </h2>
          <p className="text-sm text-muted-foreground">For {clientName}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service Dates</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="servicesDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Services Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      rows={4}
                      placeholder="Describe the care and support services to be provided…"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="visitFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visit Frequency</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} placeholder="e.g. Twice daily" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visitDurationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        placeholder="e.g. 60"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Costs</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {(
              [
                ["costPerVisit", "Cost per Visit (£)"],
                ["costPerHour", "Cost per Hour (£)"],
                ["weeklyCost", "Weekly Cost (£)"],
                ["noticePeriodDays", "Notice Period (days)"],
              ] as const
            ).map(([name, label]) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <FormField
              control={form.control}
              name="paymentTerms"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Payment Terms</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="e.g. Monthly invoice" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signatures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="agreementDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agreement Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {(
              [
                ["signedByServiceUser", "Signed by service user"],
                ["signedByProvider", "Signed by provider"],
                ["inspectionReportProvided", "Inspection report provided to service user"],
              ] as const
            ).map(([name, label]) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value as boolean}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">{label}</FormLabel>
                  </FormItem>
                )}
              />
            ))}
            <FormField
              control={form.control}
              name="signedByRepresentative"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Signed by Representative</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="Name if signed by representative" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : isEdit ? "Update Agreement" : "Save Agreement"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

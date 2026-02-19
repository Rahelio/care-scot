"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { AlertTriangle, TriangleAlert } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";

// ─── NCC MERP category metadata ────────────────────────────────────────────

export const NCC_MERP_CATEGORIES = [
  {
    value: "A",
    label: "A — Circumstances / Near Miss",
    description:
      "Circumstances or events that have the capacity to cause error (near miss — error did not occur).",
    highSeverity: false,
  },
  {
    value: "B",
    label: "B — Error, No Harm (did not reach patient)",
    description:
      "An error occurred but the medication did not reach the patient.",
    highSeverity: false,
  },
  {
    value: "C",
    label: "C — Error, No Harm (reached patient)",
    description:
      "An error occurred and the medication reached the patient, but caused no harm.",
    highSeverity: false,
  },
  {
    value: "D",
    label: "D — Error, Monitoring Required",
    description:
      "An error occurred that required monitoring to confirm no harm resulted.",
    highSeverity: false,
  },
  {
    value: "E",
    label: "E — Temporary Harm, Intervention Required",
    description:
      "An error contributed to temporary patient harm and required intervention.",
    highSeverity: true,
  },
  {
    value: "F",
    label: "F — Temporary Harm, Hospitalisation",
    description:
      "An error contributed to temporary patient harm and required initial or prolonged hospitalisation.",
    highSeverity: true,
  },
  {
    value: "G",
    label: "G — Permanent Patient Harm",
    description: "An error contributed to or resulted in permanent patient harm.",
    highSeverity: true,
  },
  {
    value: "H",
    label: "H — Near-Death Event",
    description:
      "An error required intervention necessary to sustain life (near-death).",
    highSeverity: true,
  },
  {
    value: "I",
    label: "I — Patient Death",
    description: "An error contributed to or resulted in the patient's death.",
    highSeverity: true,
  },
] as const;

export const ERROR_TYPES = [
  { value: "WRONG_DOSE", label: "Wrong Dose" },
  { value: "WRONG_MEDICATION", label: "Wrong Medication" },
  { value: "WRONG_TIME", label: "Wrong Time" },
  { value: "OMISSION", label: "Omission (Missed Dose)" },
  { value: "WRONG_ROUTE", label: "Wrong Route" },
  { value: "WRONG_PATIENT", label: "Wrong Patient" },
  { value: "DOCUMENTATION_ERROR", label: "Documentation Error" },
  { value: "OTHER", label: "Other" },
] as const;

// ─── Form schema ────────────────────────────────────────────────────────────

const schema = z.object({
  serviceUserId: z.string().uuid().optional(),
  errorDate: z.string().min(1, "Error date is required"),
  errorType: z.string().min(1, "Error type is required"),
  nccMerpCategory: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  actionTaken: z.string().optional(),
  lessonsLearned: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Props ──────────────────────────────────────────────────────────────────

interface ErrorReportFormProps {
  /** Pre-select a service user when reporting from their profile */
  defaultServiceUserId?: string;
  defaultServiceUserName?: string;
  /** Called after successful submission */
  onSuccess?: (id: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ErrorReportForm({
  defaultServiceUserId,
  defaultServiceUserName,
  onSuccess,
}: ErrorReportFormProps) {
  const router = useRouter();

  const { data: clientsData } = trpc.clients.list.useQuery({
    status: "ACTIVE",
    limit: 200,
  });
  const clients = clientsData?.items ?? [];

  const reportMutation = trpc.medication.errors.report.useMutation({
    onSuccess: (data) => {
      toast.success("Medication error reported successfully.");
      if (onSuccess) {
        onSuccess(data.id);
      } else {
        router.push("/medication/errors");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit error report.");
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      serviceUserId: defaultServiceUserId ?? "",
      errorDate: new Date().toISOString().split("T")[0],
      errorType: "",
      nccMerpCategory: "",
      description: "",
      actionTaken: "",
      lessonsLearned: "",
    },
  });

  const selectedCategory = form.watch("nccMerpCategory");
  const categoryMeta = NCC_MERP_CATEGORIES.find(
    (c) => c.value === selectedCategory
  );
  const isHighSeverity = categoryMeta?.highSeverity ?? false;

  async function onSubmit(values: FormValues) {
    await reportMutation.mutateAsync({
      serviceUserId: values.serviceUserId || undefined,
      errorDate: values.errorDate,
      errorType: values.errorType as never,
      nccMerpCategory: values.nccMerpCategory
        ? (values.nccMerpCategory as never)
        : undefined,
      description: values.description,
      actionTaken: values.actionTaken || undefined,
      lessonsLearned: values.lessonsLearned || undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Service User */}
        {defaultServiceUserId ? (
          <div className="rounded-md border px-4 py-3 text-sm bg-muted/30">
            <span className="text-muted-foreground">Service user: </span>
            <span className="font-medium">{defaultServiceUserName}</span>
          </div>
        ) : (
          <FormField
            control={form.control}
            name="serviceUserId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service User (optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service user…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">— Not linked to a service user —</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Error Date */}
          <FormField
            control={form.control}
            name="errorDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Error</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Error Type */}
          <FormField
            control={form.control}
            name="errorType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Error Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ERROR_TYPES.map((t) => (
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
        </div>

        {/* NCC MERP Category */}
        <FormField
          control={form.control}
          name="nccMerpCategory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>NCC MERP Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category…" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">— Not categorised —</SelectItem>
                  {NCC_MERP_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoryMeta && (
                <p className="text-xs text-muted-foreground mt-1">
                  {categoryMeta.description}
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* High-severity warning */}
        {isHighSeverity && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="flex gap-3 py-4 px-4">
              <TriangleAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-destructive">
                  Care Inspectorate Notification Required
                </p>
                <p className="text-sm text-destructive/80">
                  Category {selectedCategory} errors must be notified to the
                  Care Inspectorate. Submitting this report will automatically
                  create a notification draft and alert your management team.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description of Error</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what happened, including the medication involved, who was affected, and the circumstances…"
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Action Taken */}
        <FormField
          control={form.control}
          name="actionTaken"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Immediate Action Taken</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What immediate steps were taken to manage the error and support the service user?"
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Lessons Learned */}
        <FormField
          control={form.control}
          name="lessonsLearned"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lessons Learned (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What can be done to prevent this type of error in future?"
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            disabled={reportMutation.isPending}
            variant={isHighSeverity ? "destructive" : "default"}
          >
            {reportMutation.isPending ? "Submitting…" : "Submit Error Report"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={reportMutation.isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toDateInputValue } from "@/lib/plan-warning";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  initialAssessment: z.string().optional(),
  healthNeeds: z.string().optional(),
  welfareNeeds: z.string().optional(),
  personalCareRequirements: z.string().optional(),
  howNeedsWillBeMet: z.string().optional(),
  wishesAndPreferences: z.string().optional(),
  goalsAndOutcomes: z.string().optional(),
  nextReviewDate: z.string().optional(),
  consultedWithServiceUser: z.boolean(),
  consultationNotes: z.string().optional(),
  consultedWithRepresentative: z.boolean(),
  repConsultationNotes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlanData = Record<string, any>;

interface PersonalPlanFormProps {
  serviceUserId: string;
  mode: "create" | "edit";
  planId?: string;
  defaultValues?: Partial<FormValues>;
  /** Pre-populate from an existing plan (e.g. "Create New Version" from active) */
  prefillFrom?: PlanData;
  onSaved: () => void;
  onCancel?: () => void;
}

const SECTIONS = [
  {
    title: "Assessment",
    fields: [
      {
        name: "initialAssessment" as const,
        label: "Initial Assessment",
        description: "Overall summary of the person's situation and needs",
      },
      {
        name: "healthNeeds" as const,
        label: "Health Needs",
        description: "Physical and mental health conditions and requirements",
      },
      {
        name: "welfareNeeds" as const,
        label: "Welfare Needs",
        description: "Social, emotional and wellbeing needs",
      },
    ],
  },
  {
    title: "Care Planning",
    fields: [
      {
        name: "personalCareRequirements" as const,
        label: "Personal Care Requirements",
        description: "Specific personal care tasks and how they should be carried out",
      },
      {
        name: "howNeedsWillBeMet" as const,
        label: "How Needs Will Be Met",
        description: "Detailed care plan describing the support to be provided",
      },
      {
        name: "wishesAndPreferences" as const,
        label: "Wishes and Preferences",
        description: "The person's own preferences about their care and daily life",
      },
      {
        name: "goalsAndOutcomes" as const,
        label: "Goals and Outcomes",
        description: "What the person wants to achieve; measurable outcomes",
      },
    ],
  },
];

export function PersonalPlanForm({
  serviceUserId,
  mode,
  planId,
  defaultValues,
  prefillFrom,
  onSaved,
  onCancel,
}: PersonalPlanFormProps) {
  const utils = trpc.useUtils();

  // Build initial values: explicit defaultValues > prefillFrom > empty
  const initial: Partial<FormValues> = {
    consultedWithServiceUser: false,
    consultedWithRepresentative: false,
    ...(prefillFrom && {
      initialAssessment: prefillFrom.initialAssessment ?? "",
      healthNeeds: prefillFrom.healthNeeds ?? "",
      welfareNeeds: prefillFrom.welfareNeeds ?? "",
      personalCareRequirements: prefillFrom.personalCareRequirements ?? "",
      howNeedsWillBeMet: prefillFrom.howNeedsWillBeMet ?? "",
      wishesAndPreferences: prefillFrom.wishesAndPreferences ?? "",
      goalsAndOutcomes: prefillFrom.goalsAndOutcomes ?? "",
      consultedWithServiceUser: prefillFrom.consultedWithServiceUser ?? false,
      consultedWithRepresentative: prefillFrom.consultedWithRepresentative ?? false,
      nextReviewDate: toDateInputValue(prefillFrom.nextReviewDate),
    }),
    ...defaultValues,
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      initialAssessment: "",
      healthNeeds: "",
      welfareNeeds: "",
      personalCareRequirements: "",
      howNeedsWillBeMet: "",
      wishesAndPreferences: "",
      goalsAndOutcomes: "",
      nextReviewDate: "",
      consultationNotes: "",
      repConsultationNotes: "",
      ...initial,
    },
  });

  const createMutation = trpc.clients.createPersonalPlan.useMutation();
  const updateMutation = trpc.clients.updatePersonalPlan.useMutation();
  const notifyMutation = trpc.clients.notifyPlanReady.useMutation();

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isSubmitting = isSaving || notifyMutation.isPending;

  function buildPayload(values: FormValues) {
    return {
      ...values,
      nextReviewDate: values.nextReviewDate ? new Date(values.nextReviewDate) : undefined,
    };
  }

  async function save(values: FormValues): Promise<string> {
    const payload = buildPayload(values);
    if (mode === "edit" && planId) {
      await updateMutation.mutateAsync({ id: planId, ...payload });
      return planId;
    } else {
      const plan = await createMutation.mutateAsync({ serviceUserId, ...payload });
      return plan.id;
    }
  }

  async function onSaveDraft(values: FormValues) {
    try {
      await save(values);
      toast.success("Draft saved");
      utils.clients.listPersonalPlans.invalidate({ serviceUserId });
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function onSubmitForApproval(values: FormValues) {
    try {
      const savedPlanId = await save(values);
      await notifyMutation.mutateAsync({ planId: savedPlanId, serviceUserId });
      toast.success("Plan saved and submitted for manager approval");
      utils.clients.listPersonalPlans.invalidate({ serviceUserId });
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    }
  }

  return (
    <Form {...form}>
      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {section.fields.map((f) => (
                <FormField
                  key={f.name}
                  control={form.control}
                  name={f.name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{f.label}</FormLabel>
                      <FormDescription>{f.description}</FormDescription>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={(field.value as string) ?? ""}
                          rows={4}
                          className="resize-y"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Consultation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consultation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="consultedWithServiceUser"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Service user was consulted during plan development
                  </FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="consultationNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consultation Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="consultedWithRepresentative"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Representative / family member was consulted
                  </FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="repConsultationNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Representative Consultation Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Review Date */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="nextReviewDate"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Next Review Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={form.handleSubmit(onSaveDraft)}
            disabled={isSubmitting}
          >
            {isSaving && !notifyMutation.isPending ? "Saving…" : "Save Draft"}
          </Button>
          <Button
            type="button"
            onClick={form.handleSubmit(onSubmitForApproval)}
            disabled={isSubmitting}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting && notifyMutation.isPending ? "Submitting…" : "Submit for Approval"}
          </Button>
        </div>
      </div>
    </Form>
  );
}

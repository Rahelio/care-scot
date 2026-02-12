"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { toDateInputValue } from "@/lib/plan-warning";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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

interface PersonalPlanFormProps {
  serviceUserId: string;
  clientName: string;
}

export function PersonalPlanForm({ serviceUserId, clientName }: PersonalPlanFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      consultedWithServiceUser: false,
      consultedWithRepresentative: false,
    },
  });

  const mutation = trpc.clients.createPersonalPlan.useMutation({
    onSuccess: () => {
      toast.success("Personal plan created as draft — awaiting manager approval");
      utils.clients.listPersonalPlans.invalidate({ serviceUserId });
      router.push(`/clients/${serviceUserId}/personal-plan`);
    },
    onError: (err) => toast.error(err.message),
  });

  function onSubmit(values: FormValues) {
    mutation.mutate({
      serviceUserId,
      ...values,
      nextReviewDate: values.nextReviewDate ? new Date(values.nextReviewDate) : undefined,
    });
  }

  const sections: { title: string; fields: { name: keyof FormValues; label: string; description?: string }[] }[] = [
    {
      title: "Assessment",
      fields: [
        { name: "initialAssessment", label: "Initial Assessment", description: "Overall summary of the person's situation and needs" },
        { name: "healthNeeds", label: "Health Needs", description: "Physical and mental health conditions and requirements" },
        { name: "welfareNeeds", label: "Welfare Needs", description: "Social, emotional and wellbeing needs" },
      ],
    },
    {
      title: "Care Planning",
      fields: [
        { name: "personalCareRequirements", label: "Personal Care Requirements", description: "Specific personal care tasks and how they should be carried out" },
        { name: "howNeedsWillBeMet", label: "How Needs Will Be Met", description: "Detailed care plan describing the support to be provided" },
        { name: "wishesAndPreferences", label: "Wishes and Preferences", description: "The person's own preferences about their care and daily life" },
        { name: "goalsAndOutcomes", label: "Goals and Outcomes", description: "What the person wants to achieve; measurable outcomes" },
      ],
    },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">New Personal Plan</h2>
            <p className="text-sm text-muted-foreground">For {clientName}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Plan will be saved as <strong>Draft</strong> — a manager must approve to activate
          </p>
        </div>

        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.fields.map((f) => (
                <FormField
                  key={f.name}
                  control={form.control}
                  name={f.name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{f.label}</FormLabel>
                      {f.description && (
                        <FormDescription>{f.description}</FormDescription>
                      )}
                      <FormControl>
                        <Textarea
                          {...field}
                          value={(field.value as string) ?? ""}
                          rows={4}
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
            <FormField
              control={form.control}
              name="nextReviewDate"
              render={({ field }) => (
                <FormItem>
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

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save as Draft"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

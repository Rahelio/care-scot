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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskAssessmentType, RiskLevel } from "@prisma/client";

const ASSESSMENT_TYPE_LABELS: Record<RiskAssessmentType, string> = {
  ENVIRONMENTAL: "Environmental",
  MOVING_HANDLING: "Moving & Handling",
  FALLS: "Falls",
  NUTRITION_HYDRATION: "Nutrition & Hydration",
  SKIN_INTEGRITY: "Skin Integrity",
  FIRE_SAFETY: "Fire Safety",
  LONE_WORKING: "Lone Working",
  INFECTION_CONTROL: "Infection Control",
  SPECIFIC_CARE_TASK: "Specific Care Task",
};

const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

const RISK_LEVEL_DESCRIPTIONS: Record<RiskLevel, string> = {
  LOW: "Minimal risk with current precautions in place",
  MEDIUM: "Risk present — requires monitoring and control measures",
  HIGH: "Significant risk — immediate action or specialist involvement required",
};

const ASSESSMENT_GUIDANCE: Record<RiskAssessmentType, string> = {
  ENVIRONMENTAL: "Assess the home environment for hazards including trip hazards, lighting, equipment, and access.",
  MOVING_HANDLING: "Assess manual handling requirements including transfers, repositioning, and equipment needs.",
  FALLS: "Assess fall history, mobility, balance, medication effects, and environmental factors.",
  NUTRITION_HYDRATION: "Assess dietary intake, swallowing difficulties, fluid intake, and nutritional status.",
  SKIN_INTEGRITY: "Assess pressure areas, existing wounds, skin condition, and risk factors for breakdown.",
  FIRE_SAFETY: "Assess fire risks in the home environment including smoking, heating, and evacuation ability.",
  LONE_WORKING: "Assess risks to staff working alone including communication, access, and emergency procedures.",
  INFECTION_CONTROL: "Assess infection risks including existing conditions, hygiene needs, and PPE requirements.",
  SPECIFIC_CARE_TASK: "Assess risks associated with a specific care task such as medication administration or wound care.",
};

const schema = z.object({
  assessmentType: z.nativeEnum(RiskAssessmentType),
  riskLevel: z.nativeEnum(RiskLevel),
  assessmentDate: z.string().min(1, "Required"),
  assessmentDetail: z.string().optional(),
  controlMeasures: z.string().optional(),
  nextReviewDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface RiskAssessmentFormProps {
  serviceUserId: string;
  clientName: string;
  preselectedType?: RiskAssessmentType;
}

export function RiskAssessmentForm({
  serviceUserId,
  clientName,
  preselectedType,
}: RiskAssessmentFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      assessmentType: preselectedType,
      assessmentDate: new Date().toISOString().split("T")[0],
    },
  });

  const mutation = trpc.clients.createRiskAssessment.useMutation({
    onSuccess: () => {
      toast.success("Risk assessment saved");
      utils.clients.listRiskAssessments.invalidate({ serviceUserId });
      router.push(`/clients/${serviceUserId}/risk-assessments`);
    },
    onError: (err) => toast.error(err.message),
  });

  const selectedType = form.watch("assessmentType");
  const selectedLevel = form.watch("riskLevel");

  function onSubmit(values: FormValues) {
    mutation.mutate({
      serviceUserId,
      ...values,
      assessmentDate: new Date(values.assessmentDate),
      nextReviewDate: values.nextReviewDate ? new Date(values.nextReviewDate) : undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">New Risk Assessment</h2>
          <p className="text-sm text-muted-foreground">For {clientName}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assessment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="assessmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assessment Type *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assessment type…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(ASSESSMENT_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedType && (
                    <FormDescription>{ASSESSMENT_GUIDANCE[selectedType]}</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assessmentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assessment Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
            </div>

            <FormField
              control={form.control}
              name="riskLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall Risk Level *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select risk level…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(RISK_LEVEL_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedLevel && (
                    <FormDescription>{RISK_LEVEL_DESCRIPTIONS[selectedLevel]}</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assessment Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="assessmentDetail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assessment Detail</FormLabel>
                  <FormDescription>
                    Describe the specific risks identified and the context
                  </FormDescription>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={5} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="controlMeasures"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Control Measures</FormLabel>
                  <FormDescription>
                    List the actions and precautions to reduce the identified risks
                  </FormDescription>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={5} />
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
            {mutation.isPending ? "Saving…" : "Save Assessment"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

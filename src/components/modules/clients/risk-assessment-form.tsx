"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RiskAssessmentType, RiskLevel } from "@prisma/client";

// ── Config ─────────────────────────────────────────────────────────────────────

export const ASSESSMENT_TYPE_LABELS: Record<RiskAssessmentType, string> = {
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

const ASSESSMENT_GUIDANCE: Record<RiskAssessmentType, string> = {
  ENVIRONMENTAL:
    "Assess the home environment for hazards including trip hazards, lighting, equipment, and access.",
  MOVING_HANDLING:
    "Assess manual handling requirements including transfers, repositioning, and equipment needs.",
  FALLS: "Assess fall history, mobility, balance, medication effects, and environmental factors.",
  NUTRITION_HYDRATION:
    "Assess dietary intake, swallowing difficulties, fluid intake, and nutritional status.",
  SKIN_INTEGRITY:
    "Assess pressure areas, existing wounds, skin condition, and risk factors for breakdown.",
  FIRE_SAFETY:
    "Assess fire risks in the home environment including smoking, heating, and evacuation ability.",
  LONE_WORKING:
    "Assess risks to staff working alone including communication, access, and emergency procedures.",
  INFECTION_CONTROL:
    "Assess infection risks including existing conditions, hygiene needs, and PPE requirements.",
  SPECIFIC_CARE_TASK:
    "Assess risks associated with a specific care task such as medication administration or wound care.",
};

const RISK_LEVELS: {
  value: RiskLevel;
  label: string;
  description: string;
  activeClass: string;
}[] = [
  {
    value: "LOW",
    label: "Low",
    description: "Minimal risk with current precautions in place",
    activeClass: "border-green-500 bg-green-50 text-green-800",
  },
  {
    value: "MEDIUM",
    label: "Medium",
    description: "Risk present — requires monitoring and control measures",
    activeClass: "border-yellow-500 bg-yellow-50 text-yellow-800",
  },
  {
    value: "HIGH",
    label: "High",
    description: "Significant risk — immediate action or specialist involvement required",
    activeClass: "border-red-500 bg-red-50 text-red-800",
  },
];

// ── Schema ─────────────────────────────────────────────────────────────────────

const schema = z.object({
  assessmentType: z.custom<RiskAssessmentType>((v) => typeof v === "string" && v.length > 0, {
    message: "Required",
  }),
  riskLevel: z.custom<RiskLevel>((v) => typeof v === "string" && v.length > 0, {
    message: "Required",
  }),
  assessmentDate: z.string().min(1, "Required"),
  assessmentDetail: z.string().optional(),
  controlMeasures: z.string().optional(),
  nextReviewDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExistingAssessment = Record<string, any>;

interface RiskAssessmentFormProps {
  serviceUserId: string;
  /** Pre-select the assessment type (and lock it when mode = "review") */
  assessmentType?: RiskAssessmentType;
  /** Pre-populate for review — creates a new version superseding this one */
  existingAssessment?: ExistingAssessment;
  onSaved: () => void;
  onCancel?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RiskAssessmentForm({
  serviceUserId,
  assessmentType: fixedType,
  existingAssessment,
  onSaved,
  onCancel,
}: RiskAssessmentFormProps) {
  const utils = trpc.useUtils();
  const today = new Date().toISOString().split("T")[0];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      assessmentType: fixedType ?? (existingAssessment?.assessmentType as RiskAssessmentType | undefined),
      riskLevel: existingAssessment?.riskLevel as RiskLevel | undefined,
      assessmentDate: today,
      assessmentDetail: existingAssessment?.assessmentDetail ?? "",
      controlMeasures: existingAssessment?.controlMeasures ?? "",
      nextReviewDate: "",
    },
  });

  const mutation = trpc.clients.createRiskAssessment.useMutation({
    onSuccess: () => {
      toast.success("Risk assessment saved");
      utils.clients.listRiskAssessments.invalidate({ serviceUserId });
      utils.clients.getRiskAssessmentHistory.invalidate();
      onSaved();
    },
    onError: (err) => toast.error(err.message),
  });

  const selectedType = form.watch("assessmentType") as RiskAssessmentType | undefined;
  const selectedLevel = form.watch("riskLevel") as RiskLevel | undefined;
  const isReview = !!existingAssessment;
  const typeIsLocked = !!fixedType || isReview;

  function onSubmit(values: FormValues) {
    mutation.mutate({
      serviceUserId,
      assessmentType: values.assessmentType as RiskAssessmentType,
      riskLevel: values.riskLevel as RiskLevel,
      assessmentDate: new Date(values.assessmentDate),
      assessmentDetail: values.assessmentDetail,
      controlMeasures: values.controlMeasures,
      nextReviewDate: values.nextReviewDate ? new Date(values.nextReviewDate) : undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assessment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type selector — locked when pre-selected */}
            <FormField
              control={form.control}
              name="assessmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assessment Type *</FormLabel>
                  {typeIsLocked ? (
                    <p className="text-sm font-medium py-2">
                      {field.value ? ASSESSMENT_TYPE_LABELS[field.value as RiskAssessmentType] : "—"}
                    </p>
                  ) : (
                    <Select value={field.value as string} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(ASSESSMENT_TYPE_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {selectedType && (
                    <FormDescription>{ASSESSMENT_GUIDANCE[selectedType]}</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dates */}
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

            {/* Risk level — colour-coded radio */}
            <FormField
              control={form.control}
              name="riskLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall Risk Level *</FormLabel>
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    {RISK_LEVELS.map((level) => {
                      const isActive = field.value === level.value;
                      return (
                        <button
                          key={level.value}
                          type="button"
                          onClick={() => field.onChange(level.value)}
                          className={cn(
                            "rounded-lg border-2 px-3 py-3 text-left transition-all",
                            isActive
                              ? level.activeClass + " border-opacity-100"
                              : "border-muted bg-muted/20 text-muted-foreground hover:bg-muted/40"
                          )}
                        >
                          <p className="text-sm font-semibold">{level.label}</p>
                          <p className="text-xs mt-0.5 leading-snug opacity-80">
                            {level.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  {selectedLevel && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Selected:{" "}
                      <span className="font-medium">
                        {RISK_LEVELS.find((l) => l.value === selectedLevel)?.label}
                      </span>
                    </p>
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
                    <Textarea {...field} value={field.value ?? ""} rows={4} className="resize-y" />
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
                    Actions and precautions to reduce the identified risks
                  </FormDescription>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={4} className="resize-y" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Saving…"
              : isReview
              ? "Save Review"
              : "Save Assessment"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

"use client";

import { useState } from "react";
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

// ── Types ──────────────────────────────────────────────────────────────────────

export type ChecklistAnswer = "yes" | "no" | "na";

type ChecklistSection = {
  section: string;
  items: { id: string; question: string }[];
};

// ── Checklist questions ─────────────────────────────────────────────────────────

export const CHECKLIST_QUESTIONS: Record<RiskAssessmentType, ChecklistSection[]> = {
  ENVIRONMENTAL: [
    {
      section: "Home Environment",
      items: [
        { id: "env_01", question: "Is the home free from trip hazards (trailing cables, loose rugs, clutter)?" },
        { id: "env_02", question: "Are floor surfaces safe and non-slip?" },
        { id: "env_03", question: "Is lighting adequate throughout, including at night?" },
        { id: "env_04", question: "Is furniture stable and in good condition?" },
      ],
    },
    {
      section: "Access & Mobility",
      items: [
        { id: "env_05", question: "Are stairs safe with appropriate handrails?" },
        { id: "env_06", question: "Are external steps and paths in good condition?" },
        { id: "env_07", question: "Can the client access all required areas (kitchen, bathroom, bedroom)?" },
        { id: "env_08", question: "Is there clear space for mobility aids to manoeuvre?" },
      ],
    },
    {
      section: "Utilities & Storage",
      items: [
        { id: "env_09", question: "Is heating adequate and functioning?" },
        { id: "env_10", question: "Are electrical items visibly safe and well maintained?" },
        { id: "env_11", question: "Are cleaning products and chemicals stored safely?" },
        { id: "env_12", question: "Is the kitchen environment safe (cooker/microwave, food storage)?" },
      ],
    },
    {
      section: "Security & Communication",
      items: [
        { id: "env_13", question: "Is the property secure (doors and windows lock correctly)?" },
        { id: "env_14", question: "Does the client have a working telephone or means to summon help?" },
        { id: "env_15", question: "Is the property free of significant damp or mould?" },
      ],
    },
  ],
  MOVING_HANDLING: [
    {
      section: "Client Assessment",
      items: [
        { id: "mh_01", question: "Has the client's weight and height been recorded?" },
        { id: "mh_02", question: "Is the client able to assist with transfers in any way?" },
        { id: "mh_03", question: "Does the client have any conditions affecting strength, balance, or co-operation?" },
        { id: "mh_04", question: "Are there any painful areas or injuries to consider during handling?" },
      ],
    },
    {
      section: "Equipment",
      items: [
        { id: "mh_05", question: "Is a hoist required for transfers?" },
        { id: "mh_06", question: "Is appropriate equipment available (hoist, sling, slide sheets, transfer belt)?" },
        { id: "mh_07", question: "Has all equipment been safety-checked and is in good working order?" },
        { id: "mh_08", question: "Is there adequate space to use the equipment safely?" },
      ],
    },
    {
      section: "Environment & Staffing",
      items: [
        { id: "mh_09", question: "Is the floor surface safe for the handling task?" },
        { id: "mh_10", question: "Is the bed at an appropriate and adjustable working height?" },
        { id: "mh_11", question: "Are all care workers trained in moving and handling for this client?" },
        { id: "mh_12", question: "Is a minimum of two care workers required for any handling task?" },
      ],
    },
  ],
  FALLS: [
    {
      section: "Fall History",
      items: [
        { id: "fa_01", question: "Has the client experienced a fall in the past 12 months?" },
        { id: "fa_02", question: "Has the client experienced a fall in the past 3 months?" },
        { id: "fa_03", question: "Is the client fearful of falling?" },
      ],
    },
    {
      section: "Physical Factors",
      items: [
        { id: "fa_04", question: "Does the client have impaired balance or unsteady gait?" },
        { id: "fa_05", question: "Does the client use a mobility aid (stick, frame, or wheelchair)?" },
        { id: "fa_06", question: "Does the client have a visual impairment?" },
        { id: "fa_07", question: "Are the client's footwear and clothing appropriate and well fitting?" },
      ],
    },
    {
      section: "Medical & Medication Factors",
      items: [
        { id: "fa_08", question: "Is the client on medications that increase fall risk (sedatives, diuretics, antihypertensives)?" },
        { id: "fa_09", question: "Does the client experience dizziness or postural hypotension?" },
        { id: "fa_10", question: "Does the client have cognitive impairment that may affect safety awareness?" },
        { id: "fa_11", question: "Does the client have a history of fainting or loss of consciousness?" },
      ],
    },
    {
      section: "Environment & Actions",
      items: [
        { id: "fa_12", question: "Is the pathway to the toilet safe, particularly at night?" },
        { id: "fa_13", question: "Is a bed rail, call system, or night light in place where appropriate?" },
        { id: "fa_14", question: "Has a referral to physiotherapy been considered?" },
        { id: "fa_15", question: "Is the client wearing a falls alarm or personal safety device?" },
      ],
    },
  ],
  NUTRITION_HYDRATION: [
    {
      section: "Dietary Intake",
      items: [
        { id: "nh_01", question: "Is the client able to shop for and prepare meals independently?" },
        { id: "nh_02", question: "Are there any known dietary restrictions or allergies?" },
        { id: "nh_03", question: "Is there a nutritional care plan in place?" },
        { id: "nh_04", question: "Is there evidence of unexplained weight loss?" },
      ],
    },
    {
      section: "Swallowing & Dentition",
      items: [
        { id: "nh_05", question: "Does the client have any swallowing difficulties (dysphagia)?" },
        { id: "nh_06", question: "Has a speech and language therapy referral been made?" },
        { id: "nh_07", question: "Does the client have dental problems that affect eating?" },
        { id: "nh_08", question: "Does the client require a modified diet (soft, pureed, or thickened fluids)?" },
      ],
    },
    {
      section: "Hydration",
      items: [
        { id: "nh_09", question: "Is the client drinking adequate fluids throughout the day?" },
        { id: "nh_10", question: "Does the client show signs of dehydration (dry mouth, dark urine, confusion)?" },
        { id: "nh_11", question: "Are fluids accessible and within the client's reach at all times?" },
      ],
    },
    {
      section: "Nutritional Status",
      items: [
        { id: "nh_12", question: "Has a MUST (Malnutrition Universal Screening Tool) score been recorded?" },
        { id: "nh_13", question: "Has the client been referred to a dietitian?" },
        { id: "nh_14", question: "Is the client on any nutritional supplements?" },
      ],
    },
  ],
  SKIN_INTEGRITY: [
    {
      section: "Current Skin Condition",
      items: [
        { id: "si_01", question: "Does the client have any existing pressure ulcers or wounds?" },
        { id: "si_02", question: "Does the client have any skin conditions (eczema, psoriasis, or fragile skin)?" },
        { id: "si_03", question: "Is the skin inspected at every care visit?" },
      ],
    },
    {
      section: "Pressure Area Risk",
      items: [
        { id: "si_04", question: "Is the client at risk of pressure damage due to limited mobility?" },
        { id: "si_05", question: "Is appropriate pressure-relieving equipment in place (mattress, cushion)?" },
        { id: "si_06", question: "Does the client spend long periods in one position without repositioning?" },
      ],
    },
    {
      section: "Continence",
      items: [
        { id: "si_07", question: "Does the client have urinary or faecal continence needs?" },
        { id: "si_08", question: "Is continence being managed appropriately to protect skin integrity?" },
        { id: "si_09", question: "Is appropriate barrier cream or skin protection product in use?" },
      ],
    },
    {
      section: "Contributing Factors",
      items: [
        { id: "si_10", question: "Is the client's nutritional and hydration status adequate?" },
        { id: "si_11", question: "Is the client on any medications that may affect skin integrity?" },
        { id: "si_12", question: "Does the client have diabetes or peripheral vascular disease?" },
      ],
    },
  ],
  FIRE_SAFETY: [
    {
      section: "Detection",
      items: [
        { id: "fs_01", question: "Is there a working smoke alarm tested within the last 6 months?" },
        { id: "fs_02", question: "Is there a working carbon monoxide detector where applicable?" },
        { id: "fs_03", question: "Are smoke alarms interlinked throughout the property?" },
      ],
    },
    {
      section: "Fire Risks",
      items: [
        { id: "fs_04", question: "Does the client smoke (indoors or unsupervised)?" },
        { id: "fs_05", question: "Does the client use candles or open flames?" },
        { id: "fs_06", question: "Are electrical items left switched on unattended?" },
        { id: "fs_07", question: "Are flammable materials stored safely away from heat sources?" },
      ],
    },
    {
      section: "Evacuation",
      items: [
        { id: "fs_08", question: "Is the client able to self-evacuate in the event of a fire?" },
        { id: "fs_09", question: "Is a Personal Emergency Evacuation Plan (PEEP) in place?" },
        { id: "fs_10", question: "Are fire exits and escape routes clear and accessible?" },
        { id: "fs_11", question: "Does the client use mobility equipment that would affect evacuation?" },
      ],
    },
    {
      section: "Electrical Safety",
      items: [
        { id: "fs_12", question: "Is all electrical equipment in safe, maintained condition?" },
        { id: "fs_13", question: "Are there signs of overloaded sockets or damaged cables?" },
      ],
    },
  ],
  LONE_WORKING: [
    {
      section: "Staff Safety & Communication",
      items: [
        { id: "lw_01", question: "Are care workers required to work alone at this client's address?" },
        { id: "lw_02", question: "Is the client's address and visit schedule logged with the office?" },
        { id: "lw_03", question: "Do lone workers have a mobile phone or lone working device with adequate signal?" },
        { id: "lw_04", question: "Is a check-in and check-out system in operation?" },
      ],
    },
    {
      section: "Client & Property Risk",
      items: [
        { id: "lw_05", question: "Is there any history of challenging behaviour or aggression from the client or household members?" },
        { id: "lw_06", question: "Does the household have pets that may pose a risk to staff?" },
        { id: "lw_07", question: "Are there any known risks from third parties at the property?" },
        { id: "lw_08", question: "Has a lone working risk assessment been completed for new situations?" },
      ],
    },
    {
      section: "Emergency Procedures",
      items: [
        { id: "lw_09", question: "Do workers know what to do in an emergency at this address?" },
        { id: "lw_10", question: "Is emergency contact information held within the care plan?" },
        { id: "lw_11", question: "Is the nearest emergency access point to the property known?" },
      ],
    },
  ],
  INFECTION_CONTROL: [
    {
      section: "PPE & Hygiene",
      items: [
        { id: "ic_01", question: "Is adequate PPE available in the home (gloves, aprons, masks where indicated)?" },
        { id: "ic_02", question: "Is there a clean and accessible hand washing facility?" },
        { id: "ic_03", question: "Are care workers following hand hygiene protocols at every visit?" },
      ],
    },
    {
      section: "Client Health Status",
      items: [
        { id: "ic_04", question: "Does the client have any known infectious conditions (MRSA, C. diff, norovirus, etc.)?" },
        { id: "ic_05", question: "Has the relevant infection control guidance been followed for known conditions?" },
        { id: "ic_06", question: "Is the client immunocompromised?" },
      ],
    },
    {
      section: "Waste & Sharps",
      items: [
        { id: "ic_07", question: "Is there a safe system for clinical waste disposal?" },
        { id: "ic_08", question: "Are sharps (needles, lancets) stored and disposed of in a designated sharps bin?" },
      ],
    },
    {
      section: "Environment",
      items: [
        { id: "ic_09", question: "Is soiled laundry handled and stored separately from clean items?" },
        { id: "ic_10", question: "Is the home environment reasonably clean and hygienic?" },
      ],
    },
  ],
  SPECIFIC_CARE_TASK: [
    {
      section: "Task Identification",
      items: [
        { id: "sct_01", question: "Has the specific care task been clearly identified and documented?" },
        { id: "sct_02", question: "Is the care task included in the client's care plan?" },
      ],
    },
    {
      section: "Consent & Capacity",
      items: [
        { id: "sct_03", question: "Has the client given informed consent for the care task?" },
        { id: "sct_04", question: "If the client lacks capacity, has a best interests decision been documented?" },
      ],
    },
    {
      section: "Staff Competence",
      items: [
        { id: "sct_05", question: "Are all staff assigned to this task suitably trained and competent?" },
        { id: "sct_06", question: "Is there a documented procedure or protocol for the task?" },
      ],
    },
    {
      section: "Equipment & Supplies",
      items: [
        { id: "sct_07", question: "Is appropriate equipment and supplies available for the task?" },
        { id: "sct_08", question: "Is all equipment in safe working order and properly maintained?" },
      ],
    },
    {
      section: "Clinical Oversight",
      items: [
        { id: "sct_09", question: "Has the GP or relevant specialist been consulted where required?" },
        { id: "sct_10", question: "Are all care workers aware of contraindications?" },
        { id: "sct_11", question: "Is there a protocol for managing complications or emergencies?" },
      ],
    },
  ],
};

// ── Helpers ─────────────────────────────────────────────────────────────────────

export function parseChecklistData(raw?: string): Record<string, ChecklistAnswer> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed._type === "checklist" && parsed.answers && typeof parsed.answers === "object") {
      return parsed.answers as Record<string, ChecklistAnswer>;
    }
  } catch {
    // not JSON
  }
  return {};
}

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

const ANSWER_BUTTONS: { value: ChecklistAnswer; label: string; activeClass: string }[] = [
  { value: "yes", label: "Yes", activeClass: "border-green-400 bg-green-50 text-green-700" },
  { value: "no", label: "No", activeClass: "border-red-400 bg-red-50 text-red-700" },
  { value: "na", label: "N/A", activeClass: "border-slate-400 bg-slate-100 text-slate-600" },
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

  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, ChecklistAnswer>>(
    () => parseChecklistData(existingAssessment?.assessmentDetail)
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      assessmentType: fixedType ?? (existingAssessment?.assessmentType as RiskAssessmentType | undefined),
      riskLevel: existingAssessment?.riskLevel as RiskLevel | undefined,
      assessmentDate: today,
      assessmentDetail: "",
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

  function setAnswer(questionId: string, answer: ChecklistAnswer) {
    setChecklistAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }

  function onSubmit(values: FormValues) {
    const assessmentDetail = JSON.stringify({
      _type: "checklist",
      version: 1,
      answers: checklistAnswers,
    });
    mutation.mutate({
      serviceUserId,
      assessmentType: values.assessmentType as RiskAssessmentType,
      riskLevel: values.riskLevel as RiskLevel,
      assessmentDate: new Date(values.assessmentDate),
      assessmentDetail,
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
          <CardContent className="space-y-5">
            {/* Checklist */}
            {!selectedType ? (
              <p className="text-sm text-muted-foreground py-2">
                Select an assessment type to load the checklist.
              </p>
            ) : (
              <div className="space-y-5">
                {CHECKLIST_QUESTIONS[selectedType].map((section) => (
                  <div key={section.section}>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      {section.section}
                    </h4>
                    <div className="space-y-2">
                      {section.items.map((item) => {
                        const current = checklistAnswers[item.id];
                        return (
                          <div
                            key={item.id}
                            className="flex items-start justify-between gap-3 rounded-md border px-3 py-2.5 bg-muted/10"
                          >
                            <p className="text-sm leading-snug flex-1 pt-0.5">{item.question}</p>
                            <div className="flex gap-1 shrink-0">
                              {ANSWER_BUTTONS.map((btn) => (
                                <button
                                  key={btn.value}
                                  type="button"
                                  onClick={() => setAnswer(item.id, btn.value)}
                                  className={cn(
                                    "rounded border px-2 py-1 text-xs font-medium transition-all",
                                    current === btn.value
                                      ? btn.activeClass
                                      : "border-muted bg-transparent text-muted-foreground hover:bg-muted/30"
                                  )}
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Control measures / additional notes */}
            <FormField
              control={form.control}
              name="controlMeasures"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes / Control Measures</FormLabel>
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

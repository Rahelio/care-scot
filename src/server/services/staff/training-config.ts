import { TrainingType, StaffRoleType } from "@prisma/client";

// ── Human-readable labels ────────────────────────────────────────────────────

export const TRAINING_LABELS: Record<TrainingType, string> = {
  FIRE_SAFETY: "Fire Safety",
  HEALTH_AND_SAFETY: "Health & Safety",
  INFECTION_CONTROL: "Infection Control",
  FOOD_HYGIENE: "Food Hygiene",
  FIRST_AID: "First Aid",
  SAFEGUARDING_ADULTS: "Safeguarding Adults",
  MENTAL_CAPACITY_AWI: "Mental Capacity / AWI",
  EQUALITY_DIVERSITY: "Equality & Diversity",
  DATA_PROTECTION: "Data Protection",
  MOVING_HANDLING: "Moving & Handling",
  MEDICATION_ADMIN: "Medication Admin",
  CATHETER_CARE: "Catheter Care",
  DIABETES_CARE: "Diabetes Care",
  DEMENTIA_AWARENESS: "Dementia Awareness",
  END_OF_LIFE: "End of Life Care",
  SPECIALIST_OTHER: "Specialist / Other",
};

// ── Mandatory training sets ───────────────────────────────────────────────────

const BASE_MANDATORY: TrainingType[] = [
  "FIRE_SAFETY",
  "HEALTH_AND_SAFETY",
  "INFECTION_CONTROL",
  "FIRST_AID",
  "SAFEGUARDING_ADULTS",
  "MENTAL_CAPACITY_AWI",
  "EQUALITY_DIVERSITY",
  "DATA_PROTECTION",
  "MOVING_HANDLING",
];

export const MANDATORY_BY_ROLE: Record<StaffRoleType, TrainingType[]> = {
  CARER: [...BASE_MANDATORY, "DEMENTIA_AWARENESS"],
  SENIOR_CARER: [
    ...BASE_MANDATORY,
    "DEMENTIA_AWARENESS",
    "MEDICATION_ADMIN",
    "END_OF_LIFE",
  ],
  NURSE: [
    ...BASE_MANDATORY,
    "MEDICATION_ADMIN",
    "CATHETER_CARE",
    "DIABETES_CARE",
    "DEMENTIA_AWARENESS",
    "END_OF_LIFE",
  ],
  COORDINATOR: BASE_MANDATORY,
  MANAGER: BASE_MANDATORY,
  ADMIN: BASE_MANDATORY,
  OTHER: BASE_MANDATORY,
};

export function getMandatoryTraining(roleType: StaffRoleType): TrainingType[] {
  return MANDATORY_BY_ROLE[roleType] ?? BASE_MANDATORY;
}

/** Union of all mandatory training types across every role */
export const ALL_MANDATORY_TYPES: TrainingType[] = [
  ...new Set(Object.values(MANDATORY_BY_ROLE).flat()),
];

// ── Status helpers (shared client + server) ───────────────────────────────────

export type TrainingStatus = "up_to_date" | "expiring" | "expired" | "missing";

export function computeTrainingStatus(
  expiryDate: Date | null | undefined
): "up_to_date" | "expiring" | "expired" {
  if (!expiryDate) return "up_to_date";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  if (exp < today) return "expired";
  const warn = new Date(today);
  warn.setDate(warn.getDate() + 90);
  if (exp < warn) return "expiring";
  return "up_to_date";
}

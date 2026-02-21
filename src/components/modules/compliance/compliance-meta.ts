// Shared label/colour mappings for compliance module

export const POLICY_CATEGORY_LABELS: Record<string, string> = {
  SAFEGUARDING: "Safeguarding",
  HEALTH_SAFETY: "Health & Safety",
  HR: "Human Resources",
  CLINICAL: "Clinical",
  OPERATIONAL: "Operational",
  INFORMATION_GOVERNANCE: "Information Governance",
  OTHER: "Other",
};

export const POLICY_STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  DRAFT: { label: "Draft", badgeClass: "border bg-muted text-muted-foreground" },
  ACTIVE: {
    label: "Active",
    badgeClass:
      "border bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  },
  ARCHIVED: {
    label: "Archived",
    badgeClass:
      "border bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400",
  },
};

export const COMPLAINT_STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  OPEN: { label: "Open", badgeClass: "border bg-muted text-muted-foreground" },
  INVESTIGATING: {
    label: "Investigating",
    badgeClass:
      "border bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  },
  RESOLVED: {
    label: "Resolved",
    badgeClass:
      "border bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  },
  ESCALATED: {
    label: "Escalated",
    badgeClass:
      "border bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
  },
};

export const QUALITY_AUDIT_TYPE_LABELS: Record<string, string> = {
  CARE_PLAN: "Care Plan Audit",
  MEDICATION: "Medication Audit",
  HEALTH_SAFETY: "Health & Safety Audit",
  INFECTION_CONTROL: "Infection Control",
  STAFF_FILE: "Staff File Audit",
  RECORD_KEEPING: "Record Keeping",
};

export const AUDIT_STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  OPEN: { label: "Open", badgeClass: "border bg-muted text-muted-foreground" },
  IN_PROGRESS: {
    label: "In Progress",
    badgeClass:
      "border bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  },
  CLOSED: {
    label: "Closed",
    badgeClass:
      "border bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  },
};

export const SURVEY_TYPE_LABELS: Record<string, string> = {
  SERVICE_USER: "Service User",
  FAMILY: "Family / Carer",
  STAFF: "Staff",
};

export const ANNUAL_RETURN_STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  DRAFT: { label: "Draft", badgeClass: "border bg-muted text-muted-foreground" },
  SUBMITTED: {
    label: "Submitted",
    badgeClass:
      "border bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  },
};

export const CI_GRADE_AREAS: Record<string, string> = {
  WELLBEING: "How good is our care and support during the COVID-19 pandemic?",
  LEADERSHIP: "How good is our leadership?",
  STAFFING: "How good is our staff team?",
  SETTING: "How good is our setting?",
  CARE_AND_SUPPORT: "How good is our care and support?",
};

export const GRADE_LABELS: Record<number, string> = {
  1: "Unsatisfactory",
  2: "Weak",
  3: "Adequate",
  4: "Good",
  5: "Very Good",
  6: "Excellent",
};

export function gradeColor(grade: number): string {
  if (grade <= 2) return "bg-red-100 text-red-800 border-red-200";
  if (grade === 3) return "bg-amber-100 text-amber-800 border-amber-200";
  if (grade <= 5) return "bg-green-100 text-green-800 border-green-200";
  return "bg-blue-100 text-blue-800 border-blue-200";
}

// Shared types for JSON fields
export type FindingItem = {
  id: string;
  section: string;
  item: string;
  result: "PASS" | "FAIL" | "NA";
  notes?: string;
};

export type ActionItem = {
  id: string;
  description: string;
  assignedTo?: string;
  dueDate?: string;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED";
};

export type RequirementItem = {
  id: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED";
  dueDate?: string;
  notes?: string;
};

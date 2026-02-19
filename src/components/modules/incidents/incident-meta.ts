// Shared label/colour mappings for incident module

export const INCIDENT_TYPE_LABELS: Record<string, string> = {
  ACCIDENT: "Accident",
  INCIDENT: "Incident",
  NEAR_MISS: "Near Miss",
  SAFEGUARDING: "Safeguarding",
  MEDICATION_ERROR: "Medication Error",
  DEATH: "Death",
  PROPERTY_DAMAGE: "Property Damage",
  MISSING_PERSON: "Missing Person",
  ASSAULT: "Assault",
  FIRE: "Fire",
  INFECTIOUS_OUTBREAK: "Infectious Outbreak",
  OTHER: "Other",
};

export const SEVERITY_CONFIG: Record<
  string,
  { label: string; badgeClass: string; rowClass: string }
> = {
  LOW: {
    label: "Low",
    badgeClass: "bg-muted text-muted-foreground border border-muted-foreground/20",
    rowClass: "",
  },
  MEDIUM: {
    label: "Medium",
    badgeClass:
      "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
    rowClass: "",
  },
  HIGH: {
    label: "High",
    badgeClass:
      "bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
    rowClass: "bg-orange-50/30 dark:bg-orange-950/10",
  },
  CRITICAL: {
    label: "Critical",
    badgeClass:
      "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300",
    rowClass: "bg-red-50/40 dark:bg-red-950/20",
  },
};

export const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  OPEN: {
    label: "Open",
    badgeClass: "border bg-muted text-muted-foreground",
  },
  UNDER_INVESTIGATION: {
    label: "Under Investigation",
    badgeClass:
      "border bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  },
  CLOSED: {
    label: "Closed",
    badgeClass:
      "border bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  },
};

export const SAFEGUARDING_TYPE_LABELS: Record<string, string> = {
  PHYSICAL: "Physical Abuse",
  EMOTIONAL: "Emotional / Psychological Abuse",
  SEXUAL: "Sexual Abuse",
  FINANCIAL: "Financial / Material Abuse",
  NEGLECT: "Neglect",
  SELF_NEGLECT: "Self-Neglect",
  INSTITUTIONAL: "Institutional Abuse",
  DISCRIMINATORY: "Discriminatory Abuse",
  OTHER: "Other",
};

export const SAFEGUARDING_STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  OPEN: { label: "Open", badgeClass: "border bg-muted text-muted-foreground" },
  REFERRED: {
    label: "Referred",
    badgeClass:
      "border bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30",
  },
  UNDER_INVESTIGATION: {
    label: "Under Investigation",
    badgeClass:
      "border bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30",
  },
  CLOSED: {
    label: "Closed",
    badgeClass:
      "border bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30",
  },
};

export const CI_NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  DEATH: "Death",
  SERIOUS_INJURY: "Serious Injury",
  ABUSE_ALLEGATION: "Abuse Allegation",
  SERIOUS_INCIDENT: "Serious Incident",
  MEDICATION_ERROR_E_PLUS: "Medication Error (Cat. E+)",
  INFECTIOUS_OUTBREAK: "Infectious Outbreak",
  SERVICE_DISRUPTION: "Service Disruption",
  POLICE_INVOLVEMENT: "Police Involvement",
  FIRE: "Fire",
  PROPERTY_DAMAGE: "Property Damage",
  SERVICE_CHANGE: "Service Change",
  MANAGER_CHANGE: "Manager Change",
  OWNERSHIP_CHANGE: "Ownership Change",
  REGISTRATION_VARIATION: "Registration Variation",
  SERVICE_CLOSURE: "Service Closure",
};

export const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
  HOIST: "Hoist",
  SLING: "Sling",
  BP_MONITOR: "Blood Pressure Monitor",
  THERMOMETER: "Thermometer",
  MOVING_HANDLING: "Moving & Handling Aid",
  VEHICLE: "Vehicle",
  FIRST_AID_KIT: "First Aid Kit",
  PPE_STOCK: "PPE Stock",
  OTHER: "Other",
};

export const CHECK_RESULT_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  PASS: {
    label: "Pass",
    badgeClass:
      "border bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30",
  },
  FAIL: {
    label: "Fail",
    badgeClass: "border bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30",
  },
  NEEDS_ATTENTION: {
    label: "Needs Attention",
    badgeClass:
      "border bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30",
  },
};

export type PlanWarningLevel = "none" | "warning" | "critical" | "overdue";

export interface PlanWarningStatus {
  level: PlanWarningLevel;
  daysSinceStart: number;
  message: string | null;
  blocksActions: boolean;
}

export function getPlanWarningStatus(
  serviceStartDate: Date,
  hasActivePlan: boolean
): PlanWarningStatus {
  if (hasActivePlan) {
    return { level: "none", daysSinceStart: 0, message: null, blocksActions: false };
  }

  const daysSinceStart = Math.floor(
    (Date.now() - new Date(serviceStartDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceStart >= 28) {
    return {
      level: "overdue",
      daysSinceStart,
      message: `Personal plan is ${daysSinceStart} days overdue. A plan must be created within 28 days of service start. Some actions are restricted.`,
      blocksActions: true,
    };
  }
  if (daysSinceStart >= 21) {
    return {
      level: "critical",
      daysSinceStart,
      message: `Personal plan due in ${28 - daysSinceStart} day${28 - daysSinceStart === 1 ? "" : "s"}. A personal plan must be in place within 28 days of service start.`,
      blocksActions: false,
    };
  }
  if (daysSinceStart >= 14) {
    return {
      level: "warning",
      daysSinceStart,
      message: `Personal plan should be created soon. ${28 - daysSinceStart} days remaining before the 28-day deadline.`,
      blocksActions: false,
    };
  }

  return { level: "none", daysSinceStart, message: null, blocksActions: false };
}

/** Format a date as "YYYY-MM-DD" for <input type="date"> */
export function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  try {
    return new Date(date).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

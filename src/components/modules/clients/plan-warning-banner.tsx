import { AlertTriangle, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanWarningStatus } from "@/lib/plan-warning";

const LEVEL_CONFIG = {
  warning: {
    icon: AlertTriangle,
    classes: "bg-yellow-50 border-yellow-300 text-yellow-900",
  },
  critical: {
    icon: AlertCircle,
    classes: "bg-orange-50 border-orange-300 text-orange-900",
  },
  overdue: {
    icon: XCircle,
    classes: "bg-red-50 border-red-300 text-red-900",
  },
} as const;

export function PlanWarningBanner({ warning }: { warning: PlanWarningStatus }) {
  if (warning.level === "none" || !warning.message) return null;

  const config = LEVEL_CONFIG[warning.level];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border px-4 py-3 text-sm", config.classes)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{warning.message}</p>
    </div>
  );
}

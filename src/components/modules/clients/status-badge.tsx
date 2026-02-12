import { Badge } from "@/components/ui/badge";
import type { ServiceUserStatus } from "@prisma/client";

const STATUS_MAP: Record<ServiceUserStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-green-100 text-green-800 border-green-200" },
  ON_HOLD: { label: "On Hold", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  DISCHARGED: { label: "Discharged", className: "bg-slate-100 text-slate-700 border-slate-200" },
  DECEASED: { label: "Deceased", className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
};

export function StatusBadge({ status }: { status: ServiceUserStatus }) {
  const { label, className } = STATUS_MAP[status];
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

import { Badge } from "@/components/ui/badge";
import type { StaffStatus } from "@prisma/client";

const CONFIG: Record<StaffStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-green-100 text-green-800 border-green-200" },
  SUSPENDED: { label: "Suspended", className: "bg-amber-100 text-amber-800 border-amber-200" },
  LEFT: { label: "Left", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

export function StaffStatusBadge({ status }: { status: StaffStatus }) {
  const { label, className } = CONFIG[status];
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

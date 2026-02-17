import Link from "next/link";
import { ChevronRight, Edit, Calendar, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StaffStatusBadge } from "./staff-status-badge";
import { formatDate } from "@/lib/utils";
import type { StaffStatus, StaffRoleType } from "@prisma/client";

const ROLE_LABELS: Record<StaffRoleType, string> = {
  CARER: "Carer",
  SENIOR_CARER: "Senior Carer",
  NURSE: "Nurse",
  COORDINATOR: "Coordinator",
  MANAGER: "Manager",
  ADMIN: "Admin",
  OTHER: "Other",
};

interface StaffProfileHeaderProps {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    jobTitle: string | null;
    roleType: StaffRoleType;
    status: StaffStatus;
    startDate: Date;
  };
}

export function StaffProfileHeader({ member }: StaffProfileHeaderProps) {
  return (
    <div className="border-b bg-background">
      <div className="flex items-center gap-1.5 px-6 pt-4 text-sm text-muted-foreground">
        <Link href="/staff" className="hover:text-foreground transition-colors">
          Staff
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">
          {member.firstName} {member.lastName}
        </span>
      </div>

      <div className="flex items-start justify-between px-6 py-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {member.firstName} {member.lastName}
            </h1>
            <StaffStatusBadge status={member.status} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              {member.jobTitle ?? ROLE_LABELS[member.roleType]}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Started {formatDate(member.startDate)}
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/staff/${member.id}/edit`}>
            <Edit className="h-4 w-4 mr-1.5" />
            Edit
          </Link>
        </Button>
      </div>
    </div>
  );
}

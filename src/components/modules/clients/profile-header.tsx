import Link from "next/link";
import { ChevronRight, Edit, Calendar, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { PlanWarningBanner } from "./plan-warning-banner";
import { StatusChangeButton } from "./status-change-button";
import { getPlanWarningStatus } from "@/lib/plan-warning";
import { formatDate } from "@/lib/utils";
import type { ServiceUserStatus } from "@prisma/client";

interface ProfileHeaderProps {
  client: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    chiNumber: string | null;
    status: ServiceUserStatus;
    createdAt: Date;
    hasActivePlan: boolean;
  };
}

export function ProfileHeader({ client }: ProfileHeaderProps) {
  const warning = getPlanWarningStatus(client.createdAt, client.hasActivePlan);

  return (
    <div className="border-b bg-background">
      <div className="flex items-center gap-1.5 px-6 pt-4 text-sm text-muted-foreground">
        <Link href="/clients" className="hover:text-foreground transition-colors">
          Clients
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">
          {client.firstName} {client.lastName}
        </span>
      </div>

      <div className="flex items-start justify-between px-6 py-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {client.firstName} {client.lastName}
            </h1>
            <StatusBadge status={client.status} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              DOB: {formatDate(client.dateOfBirth)}
            </span>
            {client.chiNumber && (
              <span className="flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5" />
                CHI: {client.chiNumber}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusChangeButton clientId={client.id} currentStatus={client.status} />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/clients/${client.id}/edit`}>
              <Edit className="h-4 w-4 mr-1.5" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {warning.level !== "none" && (
        <div className="px-6 pb-4">
          <PlanWarningBanner warning={warning} />
        </div>
      )}
    </div>
  );
}

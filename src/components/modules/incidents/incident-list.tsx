"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import {
  INCIDENT_TYPE_LABELS,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
} from "./incident-meta";

interface IncidentItem {
  id: string;
  incidentDate: Date | string;
  incidentType: string;
  severity: string;
  status: string;
  location: string | null;
  description: string | null;
  serviceUser: { id: string; firstName: string; lastName: string } | null;
}

interface IncidentListProps {
  incidents: IncidentItem[];
}

export function IncidentList({ incidents }: IncidentListProps) {
  if (incidents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No incidents recorded.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Service User</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {incidents.map((inc) => {
            const severityConfig = SEVERITY_CONFIG[inc.severity];
            const statusConfig = STATUS_CONFIG[inc.status];

            return (
              <TableRow key={inc.id} className={severityConfig?.rowClass}>
                <TableCell className="whitespace-nowrap font-medium">
                  {formatDate(inc.incidentDate)}
                </TableCell>
                <TableCell className="text-sm">
                  {INCIDENT_TYPE_LABELS[inc.incidentType] ?? inc.incidentType}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold ${severityConfig?.badgeClass}`}
                  >
                    {severityConfig?.label ?? inc.severity}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {inc.serviceUser
                    ? `${inc.serviceUser.firstName} ${inc.serviceUser.lastName}`
                    : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                  {inc.location || "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-xs ${statusConfig?.badgeClass}`}
                  >
                    {statusConfig?.label ?? inc.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/incidents/${inc.id}`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

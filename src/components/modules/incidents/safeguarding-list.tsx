"use client";

import Link from "next/link";
import { ChevronRight, Shield } from "lucide-react";
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
  SAFEGUARDING_TYPE_LABELS,
  SAFEGUARDING_STATUS_CONFIG,
} from "./incident-meta";

interface SafeguardingItem {
  id: string;
  concernDate: Date | string;
  concernType: string;
  status: string;
  referredTo: string | null;
  referralDate: Date | string | null;
  adultProtectionInvestigation: boolean;
  serviceUser: { id: string; firstName: string; lastName: string };
  raisedByUser: { id: string; email: string } | null;
}

interface SafeguardingListProps {
  concerns: SafeguardingItem[];
}

export function SafeguardingList({ concerns }: SafeguardingListProps) {
  if (concerns.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No safeguarding concerns recorded.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Service User</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Referred To</TableHead>
            <TableHead>Investigation</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {concerns.map((c) => {
            const statusConfig = SAFEGUARDING_STATUS_CONFIG[c.status];
            return (
              <TableRow key={c.id}>
                <TableCell className="whitespace-nowrap font-medium">
                  {formatDate(c.concernDate)}
                </TableCell>
                <TableCell className="text-sm">
                  <span className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    {c.serviceUser.firstName} {c.serviceUser.lastName}
                  </span>
                </TableCell>
                <TableCell className="text-sm">
                  {SAFEGUARDING_TYPE_LABELS[c.concernType] ?? c.concernType}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.referredTo || "—"}
                </TableCell>
                <TableCell>
                  {c.adultProtectionInvestigation ? (
                    <Badge
                      variant="outline"
                      className="text-xs bg-blue-50 text-blue-800 border-blue-200"
                    >
                      ASP Investigation
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-xs ${statusConfig?.badgeClass}`}
                  >
                    {statusConfig?.label ?? c.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/incidents/safeguarding/${c.id}`}
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

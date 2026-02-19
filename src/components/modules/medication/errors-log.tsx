"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight, CheckCircle2, Clock } from "lucide-react";
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
import { NCC_MERP_CATEGORIES, ERROR_TYPES } from "./error-report-form";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MedicationErrorItem {
  id: string;
  errorDate: Date | string;
  errorType: string;
  nccMerpCategory: string | null;
  description: string | null;
  careInspectorateNotified: boolean;
  investigationOutcome: string | null;
  investigatedBy: string | null;
  serviceUser: { id: string; firstName: string; lastName: string } | null;
  reportedByStaff: { id: string; firstName: string; lastName: string } | null;
}

interface ErrorsLogProps {
  errors: MedicationErrorItem[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getMerpBadgeVariant(
  category: string | null
): "destructive" | "secondary" | "outline" {
  if (!category) return "outline";
  if (["E", "F", "G", "H", "I"].includes(category)) return "destructive";
  if (["C", "D"].includes(category)) return "secondary";
  return "outline";
}

function getMerpBadgeClass(category: string | null): string {
  if (!category) return "";
  if (["E", "F", "G", "H", "I"].includes(category))
    return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300";
  if (category === "D")
    return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300";
  if (["B", "C"].includes(category))
    return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300";
  return "bg-muted text-muted-foreground";
}

function getErrorTypeLabel(value: string): string {
  return ERROR_TYPES.find((t) => t.value === value)?.label ?? value;
}

function getMerpLabel(value: string | null): string {
  if (!value) return "—";
  const cat = NCC_MERP_CATEGORIES.find((c) => c.value === value);
  return cat ? `Cat. ${value}` : value;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ErrorsLog({ errors }: ErrorsLogProps) {
  if (errors.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No medication errors recorded.
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
            <TableHead>Error Type</TableHead>
            <TableHead>NCC MERP</TableHead>
            <TableHead>CI Notified</TableHead>
            <TableHead>Investigation</TableHead>
            <TableHead>Reported By</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {errors.map((err) => {
            const isHighSeverity =
              err.nccMerpCategory &&
              ["E", "F", "G", "H", "I"].includes(err.nccMerpCategory);

            return (
              <TableRow
                key={err.id}
                className={
                  isHighSeverity ? "bg-red-50/50 dark:bg-red-950/20" : undefined
                }
              >
                {/* Date */}
                <TableCell className="whitespace-nowrap font-medium">
                  {formatDate(err.errorDate)}
                </TableCell>

                {/* Service User */}
                <TableCell>
                  {err.serviceUser ? (
                    <span>
                      {err.serviceUser.firstName} {err.serviceUser.lastName}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>

                {/* Error Type */}
                <TableCell className="text-sm">
                  {getErrorTypeLabel(err.errorType)}
                </TableCell>

                {/* NCC MERP Category */}
                <TableCell>
                  {err.nccMerpCategory ? (
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold ${getMerpBadgeClass(err.nccMerpCategory)}`}
                    >
                      {isHighSeverity && (
                        <AlertTriangle className="h-3 w-3 mr-1 inline-block" />
                      )}
                      {getMerpLabel(err.nccMerpCategory)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>

                {/* CI Notified */}
                <TableCell>
                  {isHighSeverity ? (
                    err.careInspectorateNotified ? (
                      <span className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Notified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-destructive">
                        <Clock className="h-3.5 w-3.5" />
                        Pending
                      </span>
                    )
                  ) : (
                    <span className="text-muted-foreground text-sm">N/A</span>
                  )}
                </TableCell>

                {/* Investigation */}
                <TableCell>
                  {err.investigatedBy ? (
                    <Badge variant="secondary" className="text-xs">
                      Investigated
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Open
                    </Badge>
                  )}
                </TableCell>

                {/* Reported By */}
                <TableCell className="text-sm text-muted-foreground">
                  {err.reportedByStaff
                    ? `${err.reportedByStaff.firstName} ${err.reportedByStaff.lastName}`
                    : "—"}
                </TableCell>

                {/* Detail link */}
                <TableCell>
                  <Link
                    href={`/medication/errors/${err.id}`}
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

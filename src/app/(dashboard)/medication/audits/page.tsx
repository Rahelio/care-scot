"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  ClipboardCheck,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

type AuditStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

interface AuditFinding {
  result: "PASS" | "FAIL" | "NA";
}

function statusBadge(status: AuditStatus) {
  if (status === "CLOSED")
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 border">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Closed
      </Badge>
    );
  if (status === "IN_PROGRESS")
    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        In Progress
      </Badge>
    );
  return (
    <Badge variant="outline">
      <AlertCircle className="h-3 w-3 mr-1" />
      Open
    </Badge>
  );
}

function complianceScore(findings: AuditFinding[] | null): string | null {
  if (!findings || findings.length === 0) return null;
  const answered = findings.filter((f) => f.result !== "NA");
  if (answered.length === 0) return null;
  const pass = findings.filter((f) => f.result === "PASS").length;
  return `${Math.round((pass / answered.length) * 100)}%`;
}

export default function MedicationAuditsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isPending } = trpc.medication.audits.list.useQuery({
    page,
    limit: 20,
    status: statusFilter ? (statusFilter as AuditStatus) : undefined,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Medication Audits</h1>
          <p className="text-muted-foreground mt-1">
            Structured medication audits covering MAR, storage, PRN protocols,
            controlled drugs, competency, and reviews.
          </p>
        </div>
        <Button asChild>
          <Link href="/medication/audits/new">
            <Plus className="h-4 w-4 mr-1.5" />
            New Audit
          </Link>
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
        {total > 0 && (
          <span className="text-sm text-muted-foreground ml-auto">
            {total} audit{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* List */}
      {isPending ? (
        <div className="py-8 text-center text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {statusFilter ? "No audits with this status." : "No audits recorded yet."}
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/medication/audits/new">Start First Audit</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((audit) => {
            const findings = audit.auditFindings as unknown as AuditFinding[] | null;
            const score = complianceScore(findings);
            const failCount = findings?.filter((f) => f.result === "FAIL").length ?? 0;

            return (
              <Link key={audit.id} href={`/medication/audits/${audit.id}`}>
                <Card className="hover:bg-muted/20 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <ClipboardCheck className="h-8 w-8 text-muted-foreground/40 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">
                            Audit — {formatDate(audit.auditDate)}
                          </p>
                          {statusBadge(audit.status as AuditStatus)}
                          {score !== null && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                parseInt(score) >= 80
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : parseInt(score) >= 60
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                              }`}
                            >
                              {score} compliance
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {audit.auditor && (
                            <span>Auditor: {audit.auditor.email}</span>
                          )}
                          {failCount > 0 && (
                            <span className="text-red-600">
                              {failCount} item{failCount !== 1 ? "s" : ""} failed
                            </span>
                          )}
                          {audit.issuesIdentified && (
                            <span className="truncate max-w-xs">
                              {audit.issuesIdentified}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

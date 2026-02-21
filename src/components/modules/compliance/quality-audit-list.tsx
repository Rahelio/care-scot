"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";
import {
  QUALITY_AUDIT_TYPE_LABELS,
  AUDIT_STATUS_CONFIG,
  type FindingItem,
} from "./compliance-meta";

const TYPES = Object.entries(QUALITY_AUDIT_TYPE_LABELS);

function complianceScore(findings: unknown): number | null {
  const items = findings as FindingItem[] | null;
  if (!items || items.length === 0) return null;
  const scorable = items.filter((f) => f.result !== "NA");
  if (scorable.length === 0) return null;
  const pass = scorable.filter((f) => f.result === "PASS").length;
  return Math.round((pass / scorable.length) * 100);
}

export function QualityAuditList() {
  const [auditType, setAuditType] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data, isPending } = trpc.compliance.audits.list.useQuery({
    auditType: auditType ? (auditType as never) : undefined,
    status: status ? (status as never) : undefined,
    page,
    limit: 20,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={auditType} onValueChange={(v) => { setAuditType(v === "ALL" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {TYPES.map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v === "ALL" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button asChild size="sm">
          <Link href="/compliance/audits/new">
            <Plus className="h-4 w-4 mr-1" /> New Audit
          </Link>
        </Button>
      </div>

      {isPending ? (
        <div className="py-12 text-center text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No quality audits recorded.
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Audit Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead>Auditor</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => {
                const sc = AUDIT_STATUS_CONFIG[a.status];
                const score = complianceScore(a.findings);
                return (
                  <TableRow key={a.id}>
                    <TableCell>{formatDate(a.auditDate)}</TableCell>
                    <TableCell className="font-medium">
                      {QUALITY_AUDIT_TYPE_LABELS[a.auditType] ?? a.auditType}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={sc?.badgeClass}>
                        {sc?.label ?? a.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {score !== null ? (
                        <span
                          className={`text-sm font-medium ${
                            score >= 80
                              ? "text-green-700"
                              : score >= 60
                                ? "text-amber-700"
                                : "text-red-700"
                          }`}
                        >
                          {score}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {a.followUpDate ? formatDate(a.followUpDate) : "—"}
                    </TableCell>
                    <TableCell>{a.auditor?.email ?? "—"}</TableCell>
                    <TableCell>
                      <Link href={`/compliance/audits/${a.id}`}>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">{total} audit{total !== 1 ? "s" : ""}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

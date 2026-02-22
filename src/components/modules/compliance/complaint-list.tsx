"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, Plus, AlertTriangle, Download } from "lucide-react";
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
import { downloadCsv } from "@/lib/download-csv";
import { COMPLAINT_STATUS_CONFIG } from "./compliance-meta";

export function ComplaintList() {
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data, isPending } = trpc.compliance.complaints.list.useQuery({
    status: status ? (status as never) : undefined,
    page,
    limit: 20,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);
  const now = useMemo(() => new Date().getTime(), [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={status} onValueChange={(v) => { setStatus(v === "ALL" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="INVESTIGATING">Investigating</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="ESCALATED">Escalated</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <ExportComplaintsButton />
        <Button asChild size="sm">
          <Link href="/compliance/complaints/new">
            <Plus className="h-4 w-4 mr-1" /> Record Complaint
          </Link>
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-3 py-4">{Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-16 w-full animate-pulse rounded-lg bg-muted" />))}</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No complaints recorded.
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date Received</TableHead>
                <TableHead>Complainant</TableHead>
                <TableHead>Service User</TableHead>
                <TableHead>Nature</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => {
                const sc = COMPLAINT_STATUS_CONFIG[c.status];
                const daysLeft = Math.ceil(
                  (new Date(c.slaDeadline).getTime() - now) / 86_400_000
                );
                return (
                  <TableRow
                    key={c.id}
                    className={c.isOverdue ? "bg-red-50/40 dark:bg-red-950/20" : ""}
                  >
                    <TableCell>{formatDate(c.dateReceived)}</TableCell>
                    <TableCell className="font-medium">
                      {c.complainantName}
                    </TableCell>
                    <TableCell>
                      {c.serviceUser
                        ? `${c.serviceUser.firstName} ${c.serviceUser.lastName}`
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-50 truncate">
                      {c.natureOfComplaint}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={sc?.badgeClass}>
                        {sc?.label ?? c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.status === "RESOLVED" ? (
                        <span className="text-sm text-green-700">Resolved</span>
                      ) : c.isOverdue ? (
                        <Badge
                          variant="outline"
                          className="bg-red-100 text-red-800 border-red-200"
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          OVERDUE
                        </Badge>
                      ) : (
                        <span className="text-sm">
                          {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/compliance/complaints/${c.id}`}>
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
          <p className="text-sm text-muted-foreground">{total} complaint{total !== 1 ? "s" : ""}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExportComplaintsButton() {
  const [exporting, setExporting] = useState(false);
  const { data } = trpc.reports.exportComplaints.useQuery(
    {},
    { enabled: exporting, staleTime: 0 },
  );

  useEffect(() => {
    if (data && exporting) {
      downloadCsv(data.csv, data.filename);
      setTimeout(() => {
        setExporting(false);
      }, 0);
    }
  }, [data, exporting]);

  return (
    <Button variant="outline" size="sm" onClick={() => setExporting(true)} disabled={exporting}>
      <Download className="h-4 w-4 mr-1.5" />
      {exporting ? "Exporting…" : "Export CSV"}
    </Button>
  );
}

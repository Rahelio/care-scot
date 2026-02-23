"use client";

import { useState, useMemo } from "react";
import { DayType, BillableVisitStatus } from "@prisma/client";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Pencil,
  Loader2,
  FileCheck,
  Clock,
  PoundSterling,
  CalendarDays,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_TYPE_VALUES = Object.values(DayType) as DayType[];
const STATUS_VALUES = Object.values(BillableVisitStatus) as BillableVisitStatus[];

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(value));
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function formatTime(date: Date | string) {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function dayTypeBadgeClass(dt: DayType): string {
  switch (dt) {
    case "SATURDAY":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "SUNDAY":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "BANK_HOLIDAY":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "";
  }
}

function dayTypeLabel(dt: DayType): string {
  switch (dt) {
    case "WEEKDAY":
      return "Weekday";
    case "SATURDAY":
      return "Saturday";
    case "SUNDAY":
      return "Sunday";
    case "BANK_HOLIDAY":
      return "Bank Holiday";
  }
}

function statusBadge(status: BillableVisitStatus) {
  switch (status) {
    case "PENDING":
      return (
        <Badge variant="outline" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    case "APPROVED":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    case "DISPUTED":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Disputed
        </Badge>
      );
    case "INVOICED":
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
          <FileCheck className="h-3 w-3 mr-1" />
          Invoiced
        </Badge>
      );
    case "VOID":
      return (
        <Badge className="bg-gray-100 text-gray-500 border-gray-200 text-xs">
          <XCircle className="h-3 w-3 mr-1" />
          Void
        </Badge>
      );
  }
}

function statusLabel(status: BillableVisitStatus): string {
  switch (status) {
    case "BANK_HOLIDAY" as string:
      return "Bank Holiday";
    default:
      return status.charAt(0) + status.slice(1).toLowerCase();
  }
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

const PAGE_SIZE = 50;

export function ReconciliationPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [filterFunderId, setFilterFunderId] = useState<string | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<BillableVisitStatus | undefined>(undefined);
  const [filterDayType, setFilterDayType] = useState<DayType | undefined>(undefined);
  const [page, setPage] = useState(1);

  // Dialog state
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeVisitId, setDisputeVisitId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");

  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [overrideVisitId, setOverrideVisitId] = useState<string | null>(null);
  const [overrideAmount, setOverrideAmount] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  // Period dates
  const periodStart = useMemo(
    () => new Date(year, month, 1).toISOString().split("T")[0],
    [year, month],
  );
  const periodEnd = useMemo(() => {
    const lastDay = new Date(year, month + 1, 0);
    return lastDay.toISOString().split("T")[0];
  }, [year, month]);

  // Year options: current year +/- 2
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  }, []);

  const utils = trpc.useUtils();

  // Queries
  const { data: funders } = trpc.financial.funders.list.useQuery({ isActive: true });

  const listQuery = trpc.financial.reconciliation.list.useQuery({
    periodStart,
    periodEnd,
    funderId: filterFunderId,
    status: filterStatus,
    dayType: filterDayType,
    page,
    limit: PAGE_SIZE,
  });

  const summaryQuery = trpc.financial.reconciliation.getSummary.useQuery({
    periodStart,
    periodEnd,
    funderId: filterFunderId,
  });

  // Mutations
  const generateMutation = trpc.financial.reconciliation.generate.useMutation({
    onSuccess: (result) => {
      utils.financial.reconciliation.list.invalidate();
      utils.financial.reconciliation.getSummary.invalidate();
      if (result.issues.length > 0) {
        alert(
          `Generated ${result.generated} billable visits. ${result.issues.length} visit(s) had issues and were skipped.`,
        );
      }
    },
  });

  const approveMutation = trpc.financial.reconciliation.approve.useMutation({
    onSuccess: () => {
      utils.financial.reconciliation.list.invalidate();
      utils.financial.reconciliation.getSummary.invalidate();
    },
  });

  const bulkApproveMutation = trpc.financial.reconciliation.bulkApprove.useMutation({
    onSuccess: () => {
      utils.financial.reconciliation.list.invalidate();
      utils.financial.reconciliation.getSummary.invalidate();
    },
  });

  const disputeMutation = trpc.financial.reconciliation.dispute.useMutation({
    onSuccess: () => {
      setDisputeDialogOpen(false);
      setDisputeVisitId(null);
      setDisputeReason("");
      utils.financial.reconciliation.list.invalidate();
      utils.financial.reconciliation.getSummary.invalidate();
    },
  });

  const overrideMutation = trpc.financial.reconciliation.override.useMutation({
    onSuccess: () => {
      setOverrideDialogOpen(false);
      setOverrideVisitId(null);
      setOverrideAmount("");
      setOverrideReason("");
      utils.financial.reconciliation.list.invalidate();
      utils.financial.reconciliation.getSummary.invalidate();
    },
  });

  const voidMutation = trpc.financial.reconciliation.void.useMutation({
    onSuccess: () => {
      utils.financial.reconciliation.list.invalidate();
      utils.financial.reconciliation.getSummary.invalidate();
    },
  });

  const isAnyMutating =
    generateMutation.isPending ||
    approveMutation.isPending ||
    bulkApproveMutation.isPending ||
    disputeMutation.isPending ||
    overrideMutation.isPending ||
    voidMutation.isPending;

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const summary = summaryQuery.data;

  const pendingCount = summary?.byStatus?.find((s) => s.status === "PENDING")?.count ?? 0;

  // Handlers
  function handleGenerate() {
    generateMutation.mutate({ periodStart, periodEnd, funderId: filterFunderId });
  }

  function handleApprove(id: string) {
    approveMutation.mutate({ id });
  }

  function handleBulkApprove() {
    bulkApproveMutation.mutate({ periodStart, periodEnd, funderId: filterFunderId });
  }

  function openDisputeDialog(id: string) {
    setDisputeVisitId(id);
    setDisputeReason("");
    setDisputeDialogOpen(true);
  }

  function handleDispute() {
    if (!disputeVisitId || !disputeReason.trim()) return;
    disputeMutation.mutate({ id: disputeVisitId, reason: disputeReason.trim() });
  }

  function openOverrideDialog(id: string) {
    setOverrideVisitId(id);
    setOverrideAmount("");
    setOverrideReason("");
    setOverrideDialogOpen(true);
  }

  function handleOverride() {
    if (!overrideVisitId || !overrideAmount || !overrideReason.trim()) return;
    overrideMutation.mutate({
      id: overrideVisitId,
      overrideAmount: overrideAmount,
      reason: overrideReason.trim(),
    });
  }

  function handleVoid(id: string) {
    if (!confirm("Are you sure you want to void this billable visit?")) return;
    voidMutation.mutate({ id });
  }

  function resetFilters() {
    setFilterFunderId(undefined);
    setFilterStatus(undefined);
    setFilterDayType(undefined);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billable Visit Reconciliation</h1>
          <p className="text-sm text-muted-foreground">
            Review, approve, and manage billable visits before invoicing.
          </p>
        </div>
      </div>

      {/* Period selector + Generate */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Month</Label>
                <Select
                  value={String(month)}
                  onValueChange={(v) => {
                    setMonth(parseInt(v, 10));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Year</Label>
                <Select
                  value={String(year)}
                  onValueChange={(v) => {
                    setYear(parseInt(v, 10));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 sm:ml-auto">
              <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CalendarDays className="h-4 w-4 mr-2" />
                )}
                Generate Billable Visits
              </Button>

              {pendingCount > 0 && (
                <Button
                  variant="outline"
                  onClick={handleBulkApprove}
                  disabled={bulkApproveMutation.isPending}
                >
                  {bulkApproveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Approve All Pending ({pendingCount})
                </Button>
              )}
            </div>
          </div>

          {generateMutation.isError && (
            <p className="mt-3 text-sm text-destructive">
              {generateMutation.error.message}
            </p>
          )}

          {generateMutation.isSuccess && (
            <p className="mt-3 text-sm text-green-700">
              Successfully generated {generateMutation.data.generated} billable visit(s) out of{" "}
              {generateMutation.data.total} eligible visit(s).
            </p>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Visits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.totalVisits}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.totalHours.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                <PoundSterling className="inline h-5 w-5 -mt-0.5" />
                {formatCurrency(Number(summary.totalAmount)).replace("£", "")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Funder</Label>
          <Select
            value={filterFunderId ?? "all"}
            onValueChange={(v) => {
              setFilterFunderId(v === "all" ? undefined : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All funders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All funders</SelectItem>
              {(funders ?? []).map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Status</Label>
          <Select
            value={filterStatus ?? "all"}
            onValueChange={(v) => {
              setFilterStatus(v === "all" ? undefined : (v as BillableVisitStatus));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_VALUES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Day Type</Label>
          <Select
            value={filterDayType ?? "all"}
            onValueChange={(v) => {
              setFilterDayType(v === "all" ? undefined : (v as DayType));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All day types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All day types</SelectItem>
              {DAY_TYPE_VALUES.map((dt) => (
                <SelectItem key={dt} value={dt}>
                  {dayTypeLabel(dt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(filterFunderId || filterStatus || filterDayType) && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Data Table */}
      {listQuery.isPending ? (
        <div className="py-12 text-center text-muted-foreground">Loading billable visits...</div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No billable visits found for {MONTHS[month]} {year}.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Use &quot;Generate Billable Visits&quot; to create them from care visit records.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[90px]">Date</TableHead>
                  <TableHead>Service User</TableHead>
                  <TableHead className="w-[110px]">Day Type</TableHead>
                  <TableHead className="w-[60px]">Start</TableHead>
                  <TableHead className="w-[60px]">End</TableHead>
                  <TableHead className="w-[80px]">Duration</TableHead>
                  <TableHead className="w-[80px] text-right">Rate</TableHead>
                  <TableHead className="w-[90px] text-right">Care Total</TableHead>
                  <TableHead className="w-[80px] text-right">Mileage</TableHead>
                  <TableHead className="w-[100px] text-right">Visit Total</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[160px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="text-sm tabular-nums">
                      {formatDate(visit.visitDate)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {visit.serviceUser.firstName} {visit.serviceUser.lastName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={visit.dayType === "WEEKDAY" ? "outline" : "default"}
                        className={cn("text-xs", dayTypeBadgeClass(visit.dayType))}
                      >
                        {dayTypeLabel(visit.dayType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {formatTime(visit.billingStart)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {formatTime(visit.billingEnd)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {formatDuration(visit.billingDurationMinutes)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-right">
                      {formatCurrency(Number(visit.appliedRatePerHour))}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-right">
                      {formatCurrency(Number(visit.lineTotal))}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-right">
                      {visit.mileageTotal
                        ? formatCurrency(Number(visit.mileageTotal))
                        : "-"}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-right font-medium">
                      {formatCurrency(Number(visit.visitTotal))}
                    </TableCell>
                    <TableCell>{statusBadge(visit.status)}</TableCell>
                    <TableCell className="text-right">
                      {visit.status === "PENDING" && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-green-700 hover:text-green-800"
                            onClick={() => handleApprove(visit.id)}
                            disabled={isAnyMutating}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-yellow-700 hover:text-yellow-800"
                            onClick={() => openDisputeDialog(visit.id)}
                            disabled={isAnyMutating}
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-blue-700 hover:text-blue-800"
                            onClick={() => openOverrideDialog(visit.id)}
                            disabled={isAnyMutating}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
                            onClick={() => handleVoid(visit.id)}
                            disabled={isAnyMutating}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                      {visit.status === "DISPUTED" && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-green-700 hover:text-green-800"
                            onClick={() => handleApprove(visit.id)}
                            disabled={isAnyMutating}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-blue-700 hover:text-blue-800"
                            onClick={() => openOverrideDialog(visit.id)}
                            disabled={isAnyMutating}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Override
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
                            onClick={() => handleVoid(visit.id)}
                            disabled={isAnyMutating}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3 pt-2">
              {page > 1 && (
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                {(page - 1) * PAGE_SIZE + 1}--{Math.min(page * PAGE_SIZE, total)} of {total}
              </span>
              {page * PAGE_SIZE < total && (
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* Dispute Dialog */}
      <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispute Billable Visit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="dispute-reason">Reason for dispute</Label>
              <Textarea
                id="dispute-reason"
                placeholder="Explain why this visit is being disputed..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDispute}
              disabled={!disputeReason.trim() || disputeMutation.isPending}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {disputeMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Submit Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override Dialog */}
      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Visit Total</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="override-amount">Override amount</Label>
              <Input
                id="override-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={overrideAmount}
                onChange={(e) => setOverrideAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="override-reason">Reason for override</Label>
              <Textarea
                id="override-reason"
                placeholder="Explain why the visit total is being overridden..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleOverride}
              disabled={
                !overrideAmount || !overrideReason.trim() || overrideMutation.isPending
              }
            >
              {overrideMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Apply Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Plus, UserRound, Download, MoreHorizontal, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { downloadCsv } from "@/lib/download-csv";
import { useDebounce } from "@/lib/use-debounce";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "./status-badge";
import { formatDate, cn } from "@/lib/utils";
import type { ServiceUserStatus } from "@prisma/client";

const STATUS_OPTIONS: { value: ServiceUserStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "DISCHARGED", label: "Discharged" },
  { value: "DECEASED", label: "Deceased" },
];

export function ServiceUserTable() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ServiceUserStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isPending } = trpc.clients.list.useQuery({
    search: debouncedSearch || undefined,
    status: status === "ALL" ? undefined : status,
    page,
    limit: 20,
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Service Users</h1>
          {data && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {data.total} {data.total === 1 ? "person" : "people"} on your caseload
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ExportServiceUsersButton />
          <Button asChild>
            <Link href="/clients/new">
              <Plus className="h-4 w-4 mr-2" />
              New Service User
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name or CHI number…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as ServiceUserStatus | "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Date of Birth</TableHead>
              <TableHead>CHI Number</TableHead>
              <TableHead>Postcode</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Completeness</TableHead>
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <>{Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 w-full animate-pulse rounded bg-muted" /></TableCell>
                  ))}
                </TableRow>
              ))}</>
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <UserRound className="h-8 w-8" />
                    <p className="text-sm">No service users found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((user) => (
                <TableRow key={user.id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/clients/${user.id}`}
                      className="font-medium hover:underline"
                    >
                      {user.lastName}, {user.firstName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.dateOfBirth)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {user.chiNumber ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.postcode ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.phonePrimary ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={user.status} />
                  </TableCell>
                  <TableCell>
                    <CompletenessBadge
                      completeness={user.completeness}
                      clientId={user.id}
                      clientName={`${user.firstName} ${user.lastName}`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${user.id}`}>View Profile</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${user.id}/care-records/new`}>Log Care Visit</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Showing {(page - 1) * data.limit + 1}–
            {Math.min(page * data.limit, data.total)} of {data.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface CompletenessData {
  hasActivePlan: boolean;
  hasSignedAgreement: boolean;
  hasConsent: boolean;
  riskAssessmentCount: number;
  score: number;
}

interface CompletenessItem {
  label: string;
  detail: string;
  complete: boolean;
  href: string;
}

function CompletenessBadge({
  completeness,
  clientId,
  clientName,
}: {
  completeness: CompletenessData;
  clientId: string;
  clientName: string;
}) {
  const [open, setOpen] = useState(false);

  const items: CompletenessItem[] = [
    {
      label: "Active care plan",
      detail: "A personal plan with status Active must exist",
      complete: completeness.hasActivePlan,
      href: `/clients/${clientId}/personal-plan`,
    },
    {
      label: "Signed service agreement",
      detail: "Agreement must be signed by both service user and provider",
      complete: completeness.hasSignedAgreement,
      href: `/clients/${clientId}/agreement`,
    },
    {
      label: "Consent records",
      detail: "At least one consent record of any type must be recorded",
      complete: completeness.hasConsent,
      href: `/clients/${clientId}/consent`,
    },
    {
      label: `Risk assessments (${completeness.riskAssessmentCount}/9)`,
      detail: "All 9 assessment types must be completed",
      complete: completeness.riskAssessmentCount === 9,
      href: `/clients/${clientId}/risk-assessments`,
    },
  ];

  return (
    <>
      <Badge
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "text-xs font-medium cursor-pointer select-none hover:opacity-80 transition-opacity",
          completeness.score === 4 &&
            "bg-green-50 text-green-700 border-green-200",
          completeness.score === 3 &&
            "bg-amber-50 text-amber-700 border-amber-200",
          completeness.score <= 2 && "bg-red-50 text-red-700 border-red-200",
        )}
      >
        {completeness.score}/4
      </Badge>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record completeness — {clientName}</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-2">
            {items.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors",
                  item.complete
                    ? "border-green-200 bg-green-50 hover:bg-green-100"
                    : "border-red-200 bg-red-50 hover:bg-red-100",
                )}
              >
                {item.complete ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      item.complete ? "text-green-800" : "text-red-800",
                    )}
                  >
                    {item.label}
                  </p>
                  <p
                    className={cn(
                      "text-xs mt-0.5",
                      item.complete ? "text-green-600" : "text-red-600",
                    )}
                  >
                    {item.detail}
                  </p>
                </div>
                <ExternalLink
                  className={cn(
                    "mt-0.5 h-3.5 w-3.5 shrink-0",
                    item.complete ? "text-green-500" : "text-red-400",
                  )}
                />
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ExportServiceUsersButton() {
  const [exporting, setExporting] = useState(false);
  const { data } = trpc.reports.exportServiceUsers.useQuery(
    {},
    { enabled: exporting, staleTime: 0 },
  );

  useEffect(() => {
    if (data && exporting) {
      downloadCsv(data.csv, data.filename);
      setTimeout (() => {
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

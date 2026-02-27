"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Plus, UserRound, Download, MoreHorizontal } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { downloadCsv } from "@/lib/download-csv";
import { useDebounce } from "@/lib/use-debounce";
import { Button } from "@/components/ui/button";
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
import { StatusBadge } from "./status-badge";
import { formatDate } from "@/lib/utils";
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
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <>{Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 w-full animate-pulse rounded bg-muted" /></TableCell>
                  ))}
                </TableRow>
              ))}</>
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32">
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

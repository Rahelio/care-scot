"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus, LayoutGrid, AlertTriangle, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
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
import { StaffStatusBadge } from "./staff-status-badge";
import { formatDate } from "@/lib/utils";
import type { StaffStatus, StaffRoleType } from "@prisma/client";

const ROLE_LABELS: Record<StaffRoleType, string> = {
  CARER: "Carer",
  SENIOR_CARER: "Senior Carer",
  NURSE: "Nurse",
  COORDINATOR: "Coordinator",
  MANAGER: "Manager",
  ADMIN: "Admin",
  OTHER: "Other",
};

const EMPLOYMENT_LABELS = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  BANK: "Bank",
  AGENCY: "Agency",
} as const;

const STATUS_OPTIONS: { value: StaffStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "LEFT", label: "Left" },
];

const ROLE_OPTIONS: { value: StaffRoleType | "ALL"; label: string }[] = [
  { value: "ALL", label: "All roles" },
  { value: "CARER", label: "Carer" },
  { value: "SENIOR_CARER", label: "Senior Carer" },
  { value: "NURSE", label: "Nurse" },
  { value: "COORDINATOR", label: "Coordinator" },
  { value: "MANAGER", label: "Manager" },
  { value: "ADMIN", label: "Admin" },
  { value: "OTHER", label: "Other" },
];

export function StaffTable() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StaffStatus | "ALL">("ALL");
  const [roleType, setRoleType] = useState<StaffRoleType | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isPending } = trpc.staff.list.useQuery({
    search: debouncedSearch || undefined,
    status: status === "ALL" ? undefined : status,
    roleType: roleType === "ALL" ? undefined : roleType,
    page,
    limit: 20,
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
          {data && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {data.total} {data.total === 1 ? "member" : "members"} in your organisation
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/staff/expiry">
              <AlertTriangle className="h-4 w-4 mr-1.5" />
              Expiry
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/staff/training-matrix">
              <LayoutGrid className="h-4 w-4 mr-1.5" />
              Matrix
            </Link>
          </Button>
          <Button asChild>
            <Link href="/staff/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name or email…"
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
            setStatus(v as StaffStatus | "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
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
        <Select
          value={roleType}
          onValueChange={(v) => {
            setRoleType(v as StaffRoleType | "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
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
              <TableHead>Role</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users className="h-8 w-8" />
                    <p className="text-sm">No staff members found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((member) => (
                <TableRow key={member.id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/staff/${member.id}`}
                      className="font-medium hover:underline"
                    >
                      {member.lastName}, {member.firstName}
                    </Link>
                    {member.jobTitle && (
                      <p className="text-xs text-muted-foreground mt-0.5">{member.jobTitle}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{ROLE_LABELS[member.roleType]}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {EMPLOYMENT_LABELS[member.employmentType]}
                  </TableCell>
                  <TableCell>
                    <StaffStatusBadge status={member.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(member.startDate)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {member.email ?? "—"}
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
            <span>Page {page} of {totalPages}</span>
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

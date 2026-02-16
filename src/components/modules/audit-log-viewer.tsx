"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { AuditAction } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Search, Filter } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuditEntry = {
  id: string;
  createdAt: Date;
  entityType: string;
  entityId: string;
  action: AuditAction;
  changes: unknown;
  ipAddress: string | null;
  user: { id: string; email: string; name: string | null } | null;
};

type FieldChange = { from?: unknown; to?: unknown };
type ChangeSet = Record<string, FieldChange>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
  VIEW: "Viewed",
  EXPORT: "Exported",
};

const ACTION_VARIANTS: Record<
  AuditAction,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CREATE: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
  VIEW: "outline",
  EXPORT: "outline",
};

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (v instanceof Date) return v.toLocaleString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function formatEntityType(s: string): string {
  // "ServiceUser" → "Service User", "StaffMember" → "Staff Member"
  return s.replace(/([a-z])([A-Z])/g, "$1 $2");
}

// ─── Change diff panel ────────────────────────────────────────────────────────

function ChangeDiff({ changes }: { changes: unknown }) {
  if (!changes || typeof changes !== "object") {
    return <p className="text-xs text-muted-foreground italic">No change details recorded.</p>;
  }

  const changeSet = changes as ChangeSet;
  const fields = Object.keys(changeSet);

  if (fields.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No fields changed.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted/40">
            <th className="text-left px-3 py-1.5 font-medium text-muted-foreground w-1/3">Field</th>
            <th className="text-left px-3 py-1.5 font-medium text-muted-foreground w-1/3">Before</th>
            <th className="text-left px-3 py-1.5 font-medium text-muted-foreground w-1/3">After</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => {
            const change = changeSet[field];
            const hasFrom = "from" in change;
            const hasTo = "to" in change;
            return (
              <tr key={field} className="border-t border-border/50">
                <td className="px-3 py-1.5 font-mono text-xs text-foreground/80">
                  {field}
                </td>
                <td className="px-3 py-1.5">
                  {hasFrom ? (
                    <span className="text-destructive/80 line-through">
                      {formatValue(change.from)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-1.5">
                  {hasTo ? (
                    <span className="text-green-700 dark:text-green-400">
                      {formatValue(change.to)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Row with expandable diff ─────────────────────────────────────────────────

function AuditRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow className="group cursor-pointer hover:bg-muted/30" onClick={() => setExpanded((x) => !x)}>
        <TableCell className="w-6 text-muted-foreground">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(entry.createdAt).toLocaleString("en-GB", {
            dateStyle: "short",
            timeStyle: "medium",
          })}
        </TableCell>
        <TableCell className="text-xs">
          {entry.user?.email ?? (
            <span className="text-muted-foreground italic">system</span>
          )}
        </TableCell>
        <TableCell>
          <Badge variant={ACTION_VARIANTS[entry.action]} className="text-xs">
            {ACTION_LABELS[entry.action]}
          </Badge>
        </TableCell>
        <TableCell className="text-xs font-medium">
          {formatEntityType(entry.entityType)}
        </TableCell>
        <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[160px]">
          {entry.entityId}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {entry.ipAddress ?? "—"}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={7} className="px-4 py-3">
            <ChangeDiff changes={entry.changes} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AuditLogViewerProps {
  /** If provided, only shows audit entries for this specific entity. */
  entityType?: string;
  entityId?: string;
}

export function AuditLogViewer({ entityType, entityId }: AuditLogViewerProps) {
  // Filters
  const [filterEntityType, setFilterEntityType] = useState(entityType ?? "");
  const [filterAction, setFilterAction] = useState<AuditAction | "">("");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [page, setPage] = useState(1);

  // If entity-scoped, use getByEntity
  const entityQuery = trpc.audit.getByEntity.useQuery(
    { entityType: entityType!, entityId: entityId! },
    { enabled: !!(entityType && entityId) },
  );

  // Otherwise use paginated list
  const listQuery = trpc.audit.list.useQuery(
    {
      entityType: filterEntityType || undefined,
      action: filterAction || undefined,
      userId: filterUserId || undefined,
      dateFrom: filterDateFrom ? new Date(filterDateFrom) : undefined,
      dateTo: filterDateTo ? new Date(filterDateTo) : undefined,
      page,
      limit: 25,
    },
    { enabled: !(entityType && entityId) },
  );

  const isEntityScoped = !!(entityType && entityId);
  const isPending = isEntityScoped ? entityQuery.isPending : listQuery.isPending;
  const entries: AuditEntry[] = isEntityScoped
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((entityQuery.data as any) ?? [])
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((listQuery.data?.items as any) ?? []);
  const total = isEntityScoped
    ? entries.length
    : (listQuery.data?.total ?? 0);
  const totalPages = isEntityScoped ? 1 : Math.ceil(total / 25);

  return (
    <div className="space-y-4">
      {/* Filters — only shown for the full list view */}
      {!isEntityScoped && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-7 h-8 text-xs"
                  placeholder="Entity type…"
                  value={filterEntityType}
                  onChange={(e) => { setFilterEntityType(e.target.value); setPage(1); }}
                />
              </div>
              <Select
                value={filterAction}
                onValueChange={(v) => { setFilterAction(v as AuditAction | ""); setPage(1); }}
              >
                <SelectTrigger className="h-8 text-xs w-[130px]">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  {Object.entries(ACTION_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                className="h-8 text-xs w-[130px]"
                value={filterDateFrom}
                onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
                placeholder="From"
              />
              <Input
                type="date"
                className="h-8 text-xs w-[130px]"
                value={filterDateTo}
                onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
                placeholder="To"
              />
              {(filterEntityType || filterAction || filterDateFrom || filterDateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setFilterEntityType("");
                    setFilterAction("");
                    setFilterDateFrom("");
                    setFilterDateTo("");
                    setPage(1);
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-6" />
              <TableHead className="text-xs">Timestamp</TableHead>
              <TableHead className="text-xs">User</TableHead>
              <TableHead className="text-xs">Action</TableHead>
              <TableHead className="text-xs">Entity Type</TableHead>
              <TableHead className="text-xs">Entity ID</TableHead>
              <TableHead className="text-xs">IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Loading audit log…
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No audit entries found.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => <AuditRow key={entry.id} entry={entry} />)
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination — only for list view */}
      {!isEntityScoped && totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

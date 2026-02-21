"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Search } from "lucide-react";
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
import { useDebounce } from "@/lib/use-debounce";
import {
  POLICY_CATEGORY_LABELS,
  POLICY_STATUS_CONFIG,
} from "./compliance-meta";

const CATEGORIES = Object.entries(POLICY_CATEGORY_LABELS);

export function PolicyList() {
  const [status, setStatus] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isPending } = trpc.compliance.policies.list.useQuery({
    status: status ? (status as never) : undefined,
    category: category ? (category as never) : undefined,
    search: debouncedSearch || undefined,
    page,
    limit: 50,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  // Group by category
  const grouped = new Map<string, typeof items>();
  for (const item of items) {
    const cat = item.policyCategory;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search policies…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v === "ALL" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={(v) => { setCategory(v === "ALL" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {CATEGORIES.map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button asChild size="sm">
          <Link href="/compliance/policies/new">
            <Plus className="h-4 w-4 mr-1" /> Add Policy
          </Link>
        </Button>
      </div>

      {isPending ? (
        <div className="py-12 text-center text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No policies found.
        </div>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([cat, catItems]) => (
            <div key={cat}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {POLICY_CATEGORY_LABELS[cat] ?? cat}
              </h3>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Policy Name</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Next Review</TableHead>
                      <TableHead>Acknowledged</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {catItems.map((p) => {
                      const sc = POLICY_STATUS_CONFIG[p.status];
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            {p.policyName}
                          </TableCell>
                          <TableCell>v{p.version}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={sc?.badgeClass}>
                              {sc?.label ?? p.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {p.nextReviewDate
                              ? formatDate(p.nextReviewDate)
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {p._count.acknowledgments} acknowledged
                          </TableCell>
                          <TableCell>
                            <Link href={`/compliance/policies/${p.id}`}>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {total} polic{total === 1 ? "y" : "ies"}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
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

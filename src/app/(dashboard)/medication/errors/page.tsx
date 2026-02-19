"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, TriangleAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorsLog } from "@/components/modules/medication/errors-log";

const CATEGORY_OPTIONS = [
  { value: "", label: "All categories" },
  { value: "A", label: "A — Near Miss" },
  { value: "B", label: "B — No Harm (not reached)" },
  { value: "C", label: "C — No Harm (reached)" },
  { value: "D", label: "D — Monitoring Required" },
  { value: "E", label: "E — Temporary Harm" },
  { value: "F", label: "F — Hospitalisation" },
  { value: "G", label: "G — Permanent Harm" },
  { value: "H", label: "H — Near-Death" },
  { value: "I", label: "I — Death" },
];

export default function MedicationErrorsPage() {
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("");

  const { data, isPending } = trpc.medication.errors.list.useQuery({
    page,
    limit: 20,
    nccMerpCategory: categoryFilter ? (categoryFilter as never) : undefined,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Medication Error Log</h1>
          <p className="text-muted-foreground mt-1">
            Record and investigate medication errors. Category E–I errors
            require Care Inspectorate notification.
          </p>
        </div>
        <Button asChild>
          <Link href="/medication/errors/new">
            <Plus className="h-4 w-4 mr-1.5" />
            Report Error
          </Link>
        </Button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 px-4 py-3">
        <TriangleAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          NCC MERP Categories A–D are low/no harm. Categories{" "}
          <strong>E–I</strong> indicate patient harm and require a Care
          Inspectorate notification and management investigation.
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Filter by NCC MERP:</span>
        <Select
          value={categoryFilter}
          onValueChange={(v) => {
            setCategoryFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {total > 0 && (
          <span className="text-sm text-muted-foreground ml-auto">
            {total} error{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Table */}
      {isPending ? (
        <div className="py-8 text-center text-muted-foreground">Loading…</div>
      ) : (
        <ErrorsLog errors={items} />
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

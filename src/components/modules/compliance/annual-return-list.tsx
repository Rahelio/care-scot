"use client";

import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { ANNUAL_RETURN_STATUS_CONFIG } from "./compliance-meta";

export function AnnualReturnList() {
  const { data: returns, isPending } =
    trpc.compliance.annualReturns.list.useQuery();

  const items = returns ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} return{items.length !== 1 ? "s" : ""}
        </p>
        <Button asChild size="sm">
          <Link href="/compliance/annual-return/new">
            <Plus className="h-4 w-4 mr-1" /> Start New Return
          </Link>
        </Button>
      </div>

      {isPending ? (
        <div className="py-12 text-center text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No annual returns recorded.
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => {
                const sc = ANNUAL_RETURN_STATUS_CONFIG[r.status];
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.year}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={sc?.badgeClass}>
                        {sc?.label ?? r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.deadlineDate ? formatDate(r.deadlineDate) : "—"}
                    </TableCell>
                    <TableCell>
                      {r.submissionDate ? formatDate(r.submissionDate) : "—"}
                    </TableCell>
                    <TableCell>
                      <Link href={`/compliance/annual-return/${r.id}`}>
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
    </div>
  );
}

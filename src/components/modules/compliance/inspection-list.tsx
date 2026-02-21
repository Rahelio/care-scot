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
import { CI_GRADE_AREAS, GRADE_LABELS, gradeColor } from "./compliance-meta";

const GRADE_KEYS = Object.keys(CI_GRADE_AREAS);

export function InspectionList() {
  const { data: inspections, isPending } =
    trpc.compliance.inspections.list.useQuery();

  const items = inspections ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} inspection{items.length !== 1 ? "s" : ""}
        </p>
        <Button asChild size="sm">
          <Link href="/compliance/inspections/new">
            <Plus className="h-4 w-4 mr-1" /> Record Inspection
          </Link>
        </Button>
      </div>

      {isPending ? (
        <div className="py-12 text-center text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No inspections recorded.
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Grades</TableHead>
                <TableHead>Requirements</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((insp) => {
                const grades = (insp.grades ?? {}) as Record<string, number>;
                const reqs = (insp.requirements ?? []) as { status: string }[];
                const openReqs = reqs.filter((r) => r.status !== "COMPLETED").length;
                return (
                  <TableRow key={insp.id}>
                    <TableCell>{formatDate(insp.inspectionDate)}</TableCell>
                    <TableCell>{insp.inspectorName || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {GRADE_KEYS.map((key) => {
                          const g = grades[key];
                          if (!g) return null;
                          return (
                            <Badge
                              key={key}
                              variant="outline"
                              className={`text-xs ${gradeColor(g)}`}
                              title={CI_GRADE_AREAS[key]}
                            >
                              {g} {GRADE_LABELS[g]}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {reqs.length > 0 ? (
                        <span className="text-sm">
                          {openReqs > 0 ? (
                            <span className="text-amber-700 font-medium">
                              {openReqs} open
                            </span>
                          ) : (
                            <span className="text-green-700">All met</span>
                          )}
                          {" / "}
                          {reqs.length} total
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/compliance/inspections/${insp.id}`}>
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

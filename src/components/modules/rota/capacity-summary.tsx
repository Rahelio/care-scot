"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { computeCapacitySummary, type CapacityStaffRow } from "@/lib/rota-capacity";
import type { RotaVisitRow } from "@/lib/rota-scheduling";

function fmtHours(n: number): string {
  return `${n.toFixed(1)} hrs`;
}

interface Props {
  visits: RotaVisitRow[];
  staff: CapacityStaffRow[];
}

export function CapacitySummary({ visits, staff }: Props) {
  const summary = computeCapacitySummary(visits, staff);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtHours(summary.availableHours)}</p>
            {summary.staffMissingContractHours > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {summary.staffMissingContractHours} staff missing contracted hours — excluded
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Required Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtHours(summary.requiredHours)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Spare Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${summary.spareHours < 0 ? "text-red-600" : "text-green-600"}`}>
              {summary.spareHours >= 0 ? "+" : ""}
              {fmtHours(summary.spareHours)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unassigned Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{fmtHours(summary.unassignedHours)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Required hours by area</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {summary.byArea.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No visits in this week.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Area</TableHead>
                  <TableHead className="text-right">Required Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.byArea.map((row) => (
                  <TableRow key={row.area}>
                    <TableCell className="text-sm">{row.area}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{fmtHours(row.requiredHours)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Travel time between visits isn&apos;t tracked and isn&apos;t reflected in these figures.
      </p>
    </div>
  );
}

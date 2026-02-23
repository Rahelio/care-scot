"use client";

import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const fmtDate = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const fmtCurrency = (v: unknown) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    Number(v),
  );

export function AgedDebtPage() {
  const { data, isLoading } = trpc.financial.reports.agedDebt.useQuery();

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">Loading...</div>
    );
  }

  if (!data) return null;

  const { buckets, items } = data;
  const total = Number(buckets.current) + Number(buckets.thirtyDays) + Number(buckets.sixtyDays) + Number(buckets.ninetyPlus);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtCurrency(total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current (0-30)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {fmtCurrency(buckets.current)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              30-60 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">
              {fmtCurrency(buckets.thirtyDays)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              60-90 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              {fmtCurrency(buckets.sixtyDays)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              90+ Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {fmtCurrency(buckets.ninetyPlus)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Funder</TableHead>
              <TableHead>Invoice Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Days Overdue</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No outstanding invoices
                </TableCell>
              </TableRow>
            ) : (
              items.map((inv) => (
                <TableRow
                  key={inv.id}
                  className={
                    inv.daysOverdue > 60
                      ? "bg-red-50 dark:bg-red-950/20"
                      : inv.daysOverdue > 30
                        ? "bg-orange-50 dark:bg-orange-950/20"
                        : inv.daysOverdue > 0
                          ? "bg-yellow-50 dark:bg-yellow-950/20"
                          : ""
                  }
                >
                  <TableCell className="font-mono text-sm">
                    {inv.invoiceNumber}
                  </TableCell>
                  <TableCell>{inv.funder.name}</TableCell>
                  <TableCell>{fmtDate.format(new Date(inv.invoiceDate))}</TableCell>
                  <TableCell>{fmtDate.format(new Date(inv.dueDate))}</TableCell>
                  <TableCell className="text-right">{fmtCurrency(inv.total)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {fmtCurrency(inv.outstanding)}
                  </TableCell>
                  <TableCell>
                    {inv.daysOverdue > 0 ? (
                      <Badge
                        variant={
                          inv.daysOverdue > 60
                            ? "destructive"
                            : inv.daysOverdue > 30
                              ? "default"
                              : "secondary"
                        }
                      >
                        {inv.daysOverdue}d
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not due</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{inv.status}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

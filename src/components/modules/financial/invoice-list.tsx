"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Send, CheckCircle, XCircle, Eye } from "lucide-react";
import { InvoiceStatus } from "@prisma/client";
import { toast } from "sonner";

const fmtDate = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const fmtCurrency = (v: unknown) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    Number(v),
  );

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  SENT: "secondary",
  PAID: "default",
  PARTIALLY_PAID: "secondary",
  OVERDUE: "destructive",
  VOID: "outline",
  WRITTEN_OFF: "outline",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
  PARTIALLY_PAID: "Part Paid",
  OVERDUE: "Overdue",
  VOID: "Void",
  WRITTEN_OFF: "Written Off",
};

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: new Date(2025, i, 1).toLocaleString("en-GB", { month: "long" }),
}));

export function InvoiceList() {
  const [funderFilter, setFunderFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [genFunderId, setGenFunderId] = useState("");
  const [genMonth, setGenMonth] = useState(new Date().getMonth());
  const [genYear, setGenYear] = useState(new Date().getFullYear());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState<string | null>(null);
  const [payDate, setPayDate] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payRef, setPayRef] = useState("");

  const utils = trpc.useUtils();
  const { data: funders = [] } = trpc.financial.funders.list.useQuery({
    isActive: true,
  });

  const { data, isLoading } = trpc.financial.invoices.list.useQuery({
    ...(funderFilter && { funderId: funderFilter }),
    ...(statusFilter && { status: statusFilter as InvoiceStatus }),
  });

  const { data: detail } = trpc.financial.invoices.getById.useQuery(
    { id: detailId! },
    { enabled: !!detailId },
  );

  const generateMut = trpc.financial.invoices.generate.useMutation({
    onSuccess: (inv) => {
      utils.financial.invoices.invalidate();
      utils.financial.reconciliation.invalidate();
      setGenerateOpen(false);
      toast.success(`Invoice ${inv.invoiceNumber} created`);
    },
    onError: (e) => toast.error(e.message),
  });

  const sendMut = trpc.financial.invoices.send.useMutation({
    onSuccess: () => {
      utils.financial.invoices.invalidate();
      toast.success("Invoice marked as sent");
    },
  });

  const payMut = trpc.financial.invoices.markPaid.useMutation({
    onSuccess: () => {
      utils.financial.invoices.invalidate();
      setPayOpen(null);
      toast.success("Payment recorded");
    },
  });

  const voidMut = trpc.financial.invoices.void.useMutation({
    onSuccess: () => {
      utils.financial.invoices.invalidate();
      toast.success("Invoice voided");
    },
  });

  function handleGenerate() {
    const start = new Date(genYear, genMonth, 1);
    const end = new Date(genYear, genMonth + 1, 0);
    generateMut.mutate({
      funderId: genFunderId,
      periodStart: start.toISOString().split("T")[0],
      periodEnd: end.toISOString().split("T")[0],
    });
  }

  const invoices = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select
            value={funderFilter || "ALL"}
            onValueChange={(v) => setFunderFilter(v === "ALL" ? "" : v)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All funders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All funders</SelectItem>
              {funders.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter || "ALL"}
            onValueChange={(v) => setStatusFilter(v === "ALL" ? "" : v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setGenerateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Generate Invoice
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Funder</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => (
                <TableRow
                  key={inv.id}
                  className={
                    inv.status === "OVERDUE" ||
                    (["SENT", "PARTIALLY_PAID"].includes(inv.status) &&
                      new Date(inv.dueDate) < new Date())
                      ? "bg-red-50 dark:bg-red-950/20"
                      : ""
                  }
                >
                  <TableCell className="font-mono text-sm">
                    {inv.invoiceNumber}
                  </TableCell>
                  <TableCell>{inv.funder.name}</TableCell>
                  <TableCell>{fmtDate.format(new Date(inv.invoiceDate))}</TableCell>
                  <TableCell>{fmtDate.format(new Date(inv.dueDate))}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {fmtDate.format(new Date(inv.periodStart))} -{" "}
                    {fmtDate.format(new Date(inv.periodEnd))}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {fmtCurrency(inv.total)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[inv.status] || "outline"}>
                      {STATUS_LABELS[inv.status] || inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setDetailId(inv.id)}
                        title="View"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {inv.status === "DRAFT" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => sendMut.mutate({ id: inv.id })}
                          title="Mark Sent"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {["SENT", "PARTIALLY_PAID"].includes(inv.status) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setPayOpen(inv.id);
                            setPayAmount(String(Number(inv.total)));
                            setPayDate(new Date().toISOString().split("T")[0]);
                          }}
                          title="Mark Paid"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {["DRAFT", "SENT"].includes(inv.status) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => voidMut.mutate({ id: inv.id })}
                          title="Void"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Generate Invoice Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Funder</Label>
              <Select value={genFunderId} onValueChange={setGenFunderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select funder" />
                </SelectTrigger>
                <SelectContent>
                  {funders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Month</Label>
                <Select
                  value={String(genMonth)}
                  onValueChange={(v) => setGenMonth(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Input
                  type="number"
                  value={genYear}
                  onChange={(e) => setGenYear(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!genFunderId || generateMut.isPending}
              onClick={handleGenerate}
            >
              {generateMut.isPending ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={() => setDetailId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Invoice {detail?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Funder</p>
                  <p className="font-medium">{detail.funder.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Period</p>
                  <p className="font-medium">
                    {fmtDate.format(new Date(detail.periodStart))} -{" "}
                    {fmtDate.format(new Date(detail.periodEnd))}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium text-lg">{fmtCurrency(detail.total)}</p>
                </div>
              </div>

              {detail.lines.map((line) => (
                <Card key={line.id}>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-medium">
                      {line.serviceUser.firstName} {line.serviceUser.lastName} -{" "}
                      {line.carePackage.packageName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="grid grid-cols-5 gap-2 text-sm text-muted-foreground mb-2">
                      <span>{line.totalVisits} visits</span>
                      <span>{Number(line.totalHours)}h</span>
                      <span>Care: {fmtCurrency(line.careTotal)}</span>
                      <span>Mileage: {fmtCurrency(line.mileageTotal)}</span>
                      <span className="font-medium text-foreground">
                        {fmtCurrency(line.lineTotal)}
                      </span>
                    </div>
                    {line.billableVisits.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Day</TableHead>
                            <TableHead className="text-xs">Duration</TableHead>
                            <TableHead className="text-xs">Rate</TableHead>
                            <TableHead className="text-xs text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {line.billableVisits.map((bv) => (
                            <TableRow key={bv.id}>
                              <TableCell className="text-xs">
                                {fmtDate.format(new Date(bv.visitDate))}
                              </TableCell>
                              <TableCell className="text-xs">{bv.dayType}</TableCell>
                              <TableCell className="text-xs">
                                {bv.billingDurationMinutes}min
                              </TableCell>
                              <TableCell className="text-xs">
                                {fmtCurrency(bv.appliedRatePerHour)}/h
                              </TableCell>
                              <TableCell className="text-xs text-right">
                                {fmtCurrency(bv.visitTotal)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mark Paid Dialog */}
      <Dialog open={!!payOpen} onOpenChange={() => setPayOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Payment Reference</Label>
              <Input
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="e.g. BACS ref"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(null)}>
              Cancel
            </Button>
            <Button
              disabled={!payDate || !payAmount || payMut.isPending}
              onClick={() =>
                payMut.mutate({
                  id: payOpen!,
                  paidDate: payDate,
                  paidAmount: payAmount,
                  paymentReference: payRef || undefined,
                })
              }
            >
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

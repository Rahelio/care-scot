"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, XCircle } from "lucide-react";
import { toast } from "sonner";

const fmtDate = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  ON_HOLD: "secondary",
  ENDED: "outline",
};

interface Props {
  serviceUserId: string;
}

export function CarePackageList({ serviceUserId }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [funderId, setFunderId] = useState("");
  const [rateCardId, setRateCardId] = useState("");
  const [packageName, setPackageName] = useState("");
  const [funderReference, setFunderReference] = useState("");
  const [billingTimeBasis, setBillingTimeBasis] = useState("SCHEDULED");
  const [roundingIncrement, setRoundingIncrement] = useState("15");
  const [minimumBillable, setMinimumBillable] = useState("15");
  const [carersRequired, setCarersRequired] = useState("1");
  const [mileageBillable, setMileageBillable] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();

  const { data: packages = [], isLoading } =
    trpc.financial.carePackages.getByServiceUser.useQuery({ serviceUserId });
  const { data: funders = [] } = trpc.financial.funders.list.useQuery({
    isActive: true,
  });
  const { data: rateCards = [] } = trpc.financial.rateCards.list.useQuery({
    ...(funderId && { funderId }),
    isActive: true,
  });

  const createMut = trpc.financial.carePackages.create.useMutation({
    onSuccess: () => {
      utils.financial.carePackages.invalidate();
      closeForm();
      toast.success("Care package created");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = trpc.financial.carePackages.update.useMutation({
    onSuccess: () => {
      utils.financial.carePackages.invalidate();
      closeForm();
      toast.success("Care package updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const endMut = trpc.financial.carePackages.end.useMutation({
    onSuccess: () => {
      utils.financial.carePackages.invalidate();
      toast.success("Care package ended");
    },
  });

  function closeForm() {
    setFormOpen(false);
    setEditId(null);
    setFunderId("");
    setRateCardId("");
    setPackageName("");
    setFunderReference("");
    setBillingTimeBasis("SCHEDULED");
    setRoundingIncrement("15");
    setMinimumBillable("15");
    setCarersRequired("1");
    setMileageBillable(false);
    setStartDate("");
    setEndDate("");
    setNotes("");
  }

  function openEdit(pkg: (typeof packages)[0]) {
    setEditId(pkg.id);
    setFunderId(pkg.funder.id);
    setRateCardId(pkg.rateCard.id);
    setPackageName(pkg.packageName);
    setFunderReference(pkg.funderReference || "");
    setBillingTimeBasis(pkg.billingTimeBasis);
    setRoundingIncrement(String(pkg.roundingIncrementMinutes));
    setMinimumBillable(String(pkg.minimumBillableMinutes));
    setCarersRequired(String(pkg.carersRequired));
    setMileageBillable(pkg.mileageBillable);
    setStartDate(new Date(pkg.startDate).toISOString().split("T")[0]);
    setEndDate(
      pkg.endDate
        ? new Date(pkg.endDate).toISOString().split("T")[0]
        : "",
    );
    setNotes(pkg.notes || "");
    setFormOpen(true);
  }

  function handleSubmit() {
    const data = {
      funderId,
      rateCardId,
      packageName,
      funderReference: funderReference || undefined,
      billingTimeBasis: billingTimeBasis as "SCHEDULED" | "ACTUAL",
      roundingIncrementMinutes: parseInt(roundingIncrement),
      minimumBillableMinutes: parseInt(minimumBillable),
      carersRequired: parseInt(carersRequired),
      mileageBillable,
      startDate,
      endDate: endDate || null,
      notes: notes || undefined,
    };

    if (editId) {
      updateMut.mutate({ id: editId, ...data });
    } else {
      createMut.mutate({ serviceUserId, ...data });
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Care Packages</h2>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Package
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Loading...</p>
      ) : packages.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No care packages. Create one to start billing.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg) => (
            <Card key={pkg.id}>
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">
                    {pkg.packageName}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {pkg.funder.name} &middot; {pkg.rateCard.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[pkg.status] || "outline"}>
                    {pkg.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEdit(pkg)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  {pkg.status === "ACTIVE" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() =>
                        endMut.mutate({
                          id: pkg.id,
                          endDate: new Date().toISOString().split("T")[0],
                        })
                      }
                      title="End package"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Billing:</span>{" "}
                    {pkg.billingTimeBasis}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rounding:</span>{" "}
                    {pkg.roundingIncrementMinutes}min
                  </div>
                  <div>
                    <span className="text-muted-foreground">Minimum:</span>{" "}
                    {pkg.minimumBillableMinutes}min
                  </div>
                  <div>
                    <span className="text-muted-foreground">Carers:</span>{" "}
                    {pkg.carersRequired}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Start:</span>{" "}
                    {fmtDate.format(new Date(pkg.startDate))}
                  </div>
                  {pkg.endDate && (
                    <div>
                      <span className="text-muted-foreground">End:</span>{" "}
                      {fmtDate.format(new Date(pkg.endDate))}
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Mileage:</span>{" "}
                    {pkg.mileageBillable ? "Yes" : "No"}
                  </div>
                  {pkg.funderReference && (
                    <div>
                      <span className="text-muted-foreground">Ref:</span>{" "}
                      {pkg.funderReference}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={() => closeForm()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Care Package" : "New Care Package"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Package Name</Label>
              <Input
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                placeholder="e.g. Home Care - Council Funded"
              />
            </div>
            <div>
              <Label>Funder</Label>
              <Select value={funderId} onValueChange={setFunderId}>
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
            <div>
              <Label>Rate Card</Label>
              <Select value={rateCardId} onValueChange={setRateCardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rate card" />
                </SelectTrigger>
                <SelectContent>
                  {rateCards.map((rc) => (
                    <SelectItem key={rc.id} value={rc.id}>
                      {rc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Funder Reference</Label>
              <Input
                value={funderReference}
                onChange={(e) => setFunderReference(e.target.value)}
                placeholder="Optional reference number"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Billing Basis</Label>
                <Select
                  value={billingTimeBasis}
                  onValueChange={setBillingTimeBasis}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="ACTUAL">Actual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Carers Required</Label>
                <Input
                  type="number"
                  min="1"
                  value={carersRequired}
                  onChange={(e) => setCarersRequired(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Rounding (min)</Label>
                <Input
                  type="number"
                  min="1"
                  value={roundingIncrement}
                  onChange={(e) => setRoundingIncrement(e.target.value)}
                />
              </div>
              <div>
                <Label>Minimum (min)</Label>
                <Input
                  type="number"
                  min="0"
                  value={minimumBillable}
                  onChange={(e) => setMinimumBillable(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="mileage"
                checked={mileageBillable}
                onCheckedChange={(c) => setMileageBillable(c === true)}
              />
              <Label htmlFor="mileage">Mileage billable</Label>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            <Button
              disabled={
                !funderId ||
                !rateCardId ||
                !packageName ||
                !startDate ||
                createMut.isPending ||
                updateMut.isPending
              }
              onClick={handleSubmit}
            >
              {editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

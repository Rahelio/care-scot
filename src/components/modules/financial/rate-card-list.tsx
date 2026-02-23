"use client";

import { useState } from "react";
import { Plus, Trash2, Copy, Eye, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ---------- Helpers ----------

const DAY_TYPES = [
  "WEEKDAY",
  "SATURDAY",
  "SUNDAY",
  "BANK_HOLIDAY",
] as const;
type DayType = (typeof DAY_TYPES)[number];

function formatDayType(dt: string): string {
  const map: Record<string, string> = {
    WEEKDAY: "Weekday",
    SATURDAY: "Saturday",
    SUNDAY: "Sunday",
    BANK_HOLIDAY: "Bank Holiday",
  };
  return map[dt] ?? dt;
}

function formatDateGB(date: Date | string | null | undefined): string {
  if (!date) return "---";
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

// ---------- Rate line form state ----------

interface RateLineForm {
  dayType: DayType;
  timeBandStart: string;
  timeBandEnd: string;
  ratePerHour: string;
  carersRequired: number;
  description: string;
}

const EMPTY_RATE_LINE: RateLineForm = {
  dayType: "WEEKDAY",
  timeBandStart: "",
  timeBandEnd: "",
  ratePerHour: "",
  carersRequired: 1,
  description: "",
};

interface RateCardFormState {
  name: string;
  funderId: string;
  effectiveFrom: string;
  notes: string;
  lines: RateLineForm[];
  mileageRatePerMile: string;
  mileageDescription: string;
}

const EMPTY_FORM: RateCardFormState = {
  name: "",
  funderId: "",
  effectiveFrom: "",
  notes: "",
  lines: [{ ...EMPTY_RATE_LINE }],
  mileageRatePerMile: "",
  mileageDescription: "",
};

// ---------- Component ----------

export function RateCardList() {
  const [funderFilter, setFunderFilter] = useState<string>("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [form, setForm] = useState<RateCardFormState>(EMPTY_FORM);
  const [editMode, setEditMode] = useState(false);

  const utils = trpc.useUtils();

  const { data: rateCards, isPending } = trpc.financial.rateCards.list.useQuery({});
  const { data: funders } = trpc.financial.funders.list.useQuery({});

  const { data: viewData } = trpc.financial.rateCards.getById.useQuery(
    { id: viewId! },
    { enabled: !!viewId }
  );

  const createMutation = trpc.financial.rateCards.create.useMutation({
    onSuccess: () => {
      toast.success("Rate card created");
      utils.financial.rateCards.list.invalidate();
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.financial.rateCards.update.useMutation({
    onSuccess: () => {
      toast.success("Rate card updated");
      utils.financial.rateCards.list.invalidate();
      utils.financial.rateCards.getById.invalidate({ id: viewId! });
      setEditMode(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const duplicateMutation = trpc.financial.rateCards.duplicate.useMutation({
    onSuccess: () => {
      toast.success("Rate card duplicated");
      utils.financial.rateCards.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Filter rate cards by funder
  const filtered = (rateCards ?? []).filter((rc) =>
    funderFilter === "ALL" ? true : rc.funderId === funderFilter
  );

  // Funder name lookup
  const funderMap = new Map((funders ?? []).map((f) => [f.id, f.name]));

  // ---------- Form helpers ----------

  function setField<K extends keyof RateCardFormState>(
    key: K,
    value: RateCardFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setLineField(
    index: number,
    key: keyof RateLineForm,
    value: string | number
  ) {
    setForm((prev) => {
      const lines = [...prev.lines];
      lines[index] = { ...lines[index], [key]: value };
      return { ...prev, lines };
    });
  }

  function addLine() {
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { ...EMPTY_RATE_LINE }],
    }));
  }

  function removeLine(index: number) {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditMode(false);
    setCreateOpen(true);
  }

  function openView(id: string) {
    setViewId(id);
    setEditMode(false);
  }

  function openEditFromView() {
    if (!viewData) return;
    setForm({
      name: viewData.name,
      funderId: viewData.funderId ?? "",
      effectiveFrom: viewData.effectiveFrom
        ? new Date(viewData.effectiveFrom).toISOString().split("T")[0]
        : "",
      notes: viewData.notes ?? "",
      lines: (viewData.lines ?? []).map((l: Record<string, unknown>) => ({
        dayType: (l.dayType as DayType) ?? "WEEKDAY",
        timeBandStart: (l.timeBandStart as string) ?? "",
        timeBandEnd: (l.timeBandEnd as string) ?? "",
        ratePerHour: String(l.ratePerHour ?? ""),
        carersRequired: (l.carersRequired as number) ?? 1,
        description: (l.description as string) ?? "",
      })),
      mileageRatePerMile: viewData.mileageRates?.[0]?.ratePerMile
        ? String(viewData.mileageRates[0].ratePerMile)
        : "",
      mileageDescription: viewData.mileageRates?.[0]?.description ?? "",
    });
    setEditMode(true);
  }

  function handleCreate() {
    createMutation.mutate({
      name: form.name,
      funderId: form.funderId || null,
      effectiveFrom: form.effectiveFrom,
      notes: form.notes || undefined,
      lines: form.lines
        .filter((l) => l.ratePerHour)
        .map((l) => ({
          dayType: l.dayType,
          timeBandStart: l.timeBandStart || null,
          timeBandEnd: l.timeBandEnd || null,
          ratePerHour: l.ratePerHour,
          carersRequired: l.carersRequired,
          description: l.description || undefined,
        })),
      mileageRatePerMile: form.mileageRatePerMile || undefined,
      mileageDescription: form.mileageDescription || undefined,
    });
  }

  function handleUpdate() {
    if (!viewId) return;
    updateMutation.mutate({
      id: viewId,
      name: form.name,
      funderId: form.funderId || null,
      effectiveFrom: form.effectiveFrom || undefined,
      notes: form.notes || undefined,
    });
  }

  function handleDuplicate(id: string, name: string) {
    duplicateMutation.mutate({
      id,
      newName: `${name} (Copy)`,
      effectiveFrom: new Date().toISOString().split("T")[0],
    });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ---------- Form dialog content ----------

  function renderFormFields() {
    return (
      <div className="grid gap-4 py-4 min-w-0">
        {/* Name & Funder */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rc-name">Name *</Label>
            <Input
              id="rc-name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. Highland Council 2026"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rc-funder">Funder</Label>
            <Select
              value={form.funderId || "NONE"}
              onValueChange={(v) => setField("funderId", v === "NONE" ? "" : v)}
            >
              <SelectTrigger id="rc-funder">
                <SelectValue placeholder="Select funder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">No funder</SelectItem>
                {(funders ?? []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Effective From & Notes */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rc-effective">Effective From</Label>
            <Input
              id="rc-effective"
              type="date"
              value={form.effectiveFrom}
              onChange={(e) => setField("effectiveFrom", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rc-notes">Notes</Label>
            <Textarea
              id="rc-notes"
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              rows={2}
            />
          </div>
        </div>

        {/* Rate Lines */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Rate Lines</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLine}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Line
            </Button>
          </div>

          {form.lines.map((line, idx) => (
            <div key={idx} className="rounded-md border p-3 space-y-2">
              {/* Row 1: Day Type, Start, End, Rate/Hr, Carers + Delete */}
              <div className="flex gap-2 items-end">
                <div className="space-y-1 w-36 shrink-0">
                  <Label className="text-xs">Day Type</Label>
                  <Select
                    value={line.dayType}
                    onValueChange={(v) =>
                      setLineField(idx, "dayType", v as DayType)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_TYPES.map((dt) => (
                        <SelectItem key={dt} value={dt}>
                          {formatDayType(dt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 w-24 shrink-0">
                  <Label className="text-xs">Start</Label>
                  <Input
                    type="time"
                    className="h-8 text-xs w-full"
                    value={line.timeBandStart}
                    onChange={(e) =>
                      setLineField(idx, "timeBandStart", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1 w-24 shrink-0">
                  <Label className="text-xs">End</Label>
                  <Input
                    type="time"
                    className="h-8 text-xs w-full"
                    value={line.timeBandEnd}
                    onChange={(e) =>
                      setLineField(idx, "timeBandEnd", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1 w-20 shrink-0">
                  <Label className="text-xs">Rate/Hr</Label>
                  <Input
                    className="h-8 text-xs w-full"
                    placeholder="0.00"
                    value={line.ratePerHour}
                    onChange={(e) =>
                      setLineField(idx, "ratePerHour", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1 w-16 shrink-0">
                  <Label className="text-xs">Carers</Label>
                  <Input
                    className="h-8 text-xs w-full"
                    type="number"
                    min={1}
                    value={line.carersRequired}
                    onChange={(e) =>
                      setLineField(
                        idx,
                        "carersRequired",
                        parseInt(e.target.value, 10) || 1
                      )
                    }
                  />
                </div>
                <div className="flex-1" />
                {form.lines.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeLine(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {/* Row 2: Description */}
              <Input
                className="h-8 text-xs"
                value={line.description}
                onChange={(e) =>
                  setLineField(idx, "description", e.target.value)
                }
                placeholder="Description (optional)"
              />
            </div>
          ))}
        </div>

        {/* Mileage Rate */}
        <div className="space-y-2">
          <Label className="text-base font-medium">
            Mileage Rate (optional)
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Rate Per Mile</Label>
              <Input
                className="h-8 text-xs"
                placeholder="0.00"
                value={form.mileageRatePerMile}
                onChange={(e) =>
                  setField("mileageRatePerMile", e.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input
                className="h-8 text-xs"
                value={form.mileageDescription}
                onChange={(e) =>
                  setField("mileageDescription", e.target.value)
                }
                placeholder="e.g. Standard mileage"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rate Cards</h1>
          {rateCards && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {rateCards.length}{" "}
              {rateCards.length === 1 ? "rate card" : "rate cards"}
            </p>
          )}
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Rate Card
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <Select
          value={funderFilter}
          onValueChange={setFunderFilter}
        >
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Filter by funder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All funders</SelectItem>
            {(funders ?? []).map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Funder</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Lines</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            ) : !filtered.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileSpreadsheet className="h-8 w-8" />
                    <p className="text-sm">No rate cards found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((rc) => (
                <TableRow key={rc.id}>
                  <TableCell className="font-medium">{rc.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {rc.funderId ? funderMap.get(rc.funderId) ?? "---" : "---"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateGB(rc.effectiveFrom)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {rc._count?.lines ?? 0}{" "}
                      {(rc._count?.lines ?? 0) === 1 ? "line" : "lines"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={rc.isActive ? "default" : "secondary"}
                      className={cn(
                        rc.isActive
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      {rc.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openView(rc.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(rc.id, rc.name)}
                        disabled={duplicateMutation.isPending}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Duplicate
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Rate Card Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Rate Card</DialogTitle>
            <DialogDescription>
              Define the rate card and its rate lines.
            </DialogDescription>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!form.name.trim() || !form.effectiveFrom || isSaving}
            >
              {createMutation.isPending ? "Creating..." : "Create Rate Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View / Edit Rate Card Dialog */}
      <Dialog
        open={!!viewId}
        onOpenChange={(v) => {
          if (!v) {
            setViewId(null);
            setEditMode(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {editMode ? (
            <>
              <DialogHeader>
                <DialogTitle>Edit Rate Card</DialogTitle>
                <DialogDescription>
                  Update the rate card details and lines.
                </DialogDescription>
              </DialogHeader>
              {renderFormFields()}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setEditMode(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={!form.name.trim() || isSaving}
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </>
          ) : viewData ? (
            <>
              <DialogHeader>
                <DialogTitle>{viewData.name}</DialogTitle>
                <DialogDescription>
                  {viewData.funderId
                    ? `Funder: ${funderMap.get(viewData.funderId) ?? "Unknown"}`
                    : "No funder assigned"}
                  {viewData.effectiveFrom &&
                    ` | Effective from ${formatDateGB(viewData.effectiveFrom)}`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {viewData.notes && (
                  <p className="text-sm text-muted-foreground">
                    {viewData.notes}
                  </p>
                )}

                {/* Rate Lines */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Rate Lines</CardTitle>
                    <CardDescription>
                      {viewData.lines?.length ?? 0}{" "}
                      {(viewData.lines?.length ?? 0) === 1 ? "line" : "lines"}{" "}
                      defined
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {viewData.lines && viewData.lines.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Day Type</TableHead>
                            <TableHead>Time Band</TableHead>
                            <TableHead>Rate/Hour</TableHead>
                            <TableHead>Carers</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewData.lines.map(
                            (line: Record<string, unknown>, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell>
                                  {formatDayType(
                                    (line.dayType as string) ?? ""
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {line.timeBandStart && line.timeBandEnd
                                    ? `${line.timeBandStart} - ${line.timeBandEnd}`
                                    : "All day"}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {formatCurrency(
                                    Number(line.ratePerHour)
                                  )}
                                </TableCell>
                                <TableCell>
                                  {(line.carersRequired as number) ?? 1}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {(line.description as string) ?? "---"}
                                </TableCell>
                              </TableRow>
                            )
                          )}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No rate lines defined
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Mileage */}
                {viewData.mileageRates?.[0] && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Mileage Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">
                        <span className="font-medium">
                          {formatCurrency(Number(viewData.mileageRates[0].ratePerMile))}
                        </span>{" "}
                        per mile
                        {viewData.mileageRates[0].description && (
                          <span className="text-muted-foreground">
                            {" "}
                            --- {viewData.mileageRates[0].description}
                          </span>
                        )}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewId(null);
                    setEditMode(false);
                  }}
                >
                  Close
                </Button>
                <Button onClick={openEditFromView}>Edit Rate Card</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="sr-only">Loading rate card</DialogTitle>
              </DialogHeader>
              <div className="py-12 text-center text-muted-foreground">
                Loading...
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

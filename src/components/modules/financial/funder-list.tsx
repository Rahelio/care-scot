"use client";

import { useState } from "react";
import { Search, Plus, Pencil, Building2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
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

// ---------- Types & Helpers ----------

const FUNDER_TYPES = [
  "LOCAL_AUTHORITY",
  "HEALTH_BOARD",
  "PRIVATE",
  "SDS",
  "OTHER",
] as const;
type FunderType = (typeof FUNDER_TYPES)[number];

const INVOICE_FREQUENCIES = ["WEEKLY", "FORTNIGHTLY", "MONTHLY"] as const;
type InvoiceFrequency = (typeof INVOICE_FREQUENCIES)[number];

const BILLING_TIME_BASES = ["SCHEDULED", "ACTUAL"] as const;
type BillingTimeBasis = (typeof BILLING_TIME_BASES)[number];

function formatFunderType(type: string): string {
  const map: Record<string, string> = {
    LOCAL_AUTHORITY: "Local Authority",
    HEALTH_BOARD: "Health Board",
    PRIVATE: "Private",
    SDS: "SDS",
    OTHER: "Other",
  };
  return map[type] ?? type;
}

function formatInvoiceFrequency(freq: string): string {
  const map: Record<string, string> = {
    WEEKLY: "Weekly",
    FORTNIGHTLY: "Fortnightly",
    MONTHLY: "Monthly",
  };
  return map[freq] ?? freq;
}

function funderTypeBadgeVariant(
  type: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (type) {
    case "LOCAL_AUTHORITY":
      return "default";
    case "HEALTH_BOARD":
      return "secondary";
    case "PRIVATE":
      return "outline";
    default:
      return "secondary";
  }
}

// ---------- Form state ----------

interface FunderFormState {
  name: string;
  funderType: FunderType;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postcode: string;
  paymentTermsDays: string;
  invoiceFrequency: InvoiceFrequency;
  billingTimeBasis: BillingTimeBasis;
  notes: string;
}

const EMPTY_FORM: FunderFormState = {
  name: "",
  funderType: "LOCAL_AUTHORITY",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  postcode: "",
  paymentTermsDays: "30",
  invoiceFrequency: "MONTHLY",
  billingTimeBasis: "SCHEDULED",
  notes: "",
};

// ---------- Component ----------

export function FunderList() {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FunderFormState>(EMPTY_FORM);

  const utils = trpc.useUtils();

  const { data: funders, isPending } = trpc.financial.funders.list.useQuery({});

  const createMutation = trpc.financial.funders.create.useMutation({
    onSuccess: () => {
      toast.success("Funder created");
      utils.financial.funders.list.invalidate();
      setAddOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.financial.funders.update.useMutation({
    onSuccess: () => {
      toast.success("Funder updated");
      utils.financial.funders.list.invalidate();
      setEditId(null);
      setForm(EMPTY_FORM);
    },
    onError: (err) => toast.error(err.message),
  });

  // Filter funders by search term
  const filtered = (funders ?? []).filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setForm(EMPTY_FORM);
    setAddOpen(true);
  }

  function openEdit(funder: (typeof filtered)[number]) {
    setForm({
      name: funder.name,
      funderType: funder.funderType as FunderType,
      contactName: funder.contactName ?? "",
      contactEmail: funder.contactEmail ?? "",
      contactPhone: funder.contactPhone ?? "",
      addressLine1: funder.addressLine1 ?? "",
      addressLine2: funder.addressLine2 ?? "",
      city: funder.city ?? "",
      postcode: funder.postcode ?? "",
      paymentTermsDays: String(funder.paymentTermsDays ?? 30),
      invoiceFrequency: (funder.invoiceFrequency ?? "MONTHLY") as InvoiceFrequency,
      billingTimeBasis: (funder.billingTimeBasis ?? "SCHEDULED") as BillingTimeBasis,
      notes: funder.notes ?? "",
    });
    setEditId(funder.id);
  }

  function handleSubmit() {
    const payload = {
      name: form.name,
      funderType: form.funderType,
      contactName: form.contactName || undefined,
      contactEmail: form.contactEmail || undefined,
      contactPhone: form.contactPhone || undefined,
      addressLine1: form.addressLine1 || undefined,
      addressLine2: form.addressLine2 || undefined,
      city: form.city || undefined,
      postcode: form.postcode || undefined,
      paymentTermsDays: parseInt(form.paymentTermsDays, 10) || 30,
      invoiceFrequency: form.invoiceFrequency,
      billingTimeBasis: form.billingTimeBasis,
      notes: form.notes || undefined,
    };

    if (editId) {
      updateMutation.mutate({ id: editId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleToggleActive(funder: (typeof filtered)[number]) {
    updateMutation.mutate({
      id: funder.id,
      isActive: !funder.isActive,
    });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function setField<K extends keyof FunderFormState>(key: K, value: FunderFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ---------- Dialog content (shared between add & edit) ----------

  function renderFormDialog(open: boolean, onOpenChange: (v: boolean) => void, title: string) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {editId
                ? "Update the funder details below."
                : "Enter the details for the new funder."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name & Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="funder-name">Name *</Label>
                <Input
                  id="funder-name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. Highland Council"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="funder-type">Funder Type *</Label>
                <Select
                  value={form.funderType}
                  onValueChange={(v) => setField("funderType", v as FunderType)}
                >
                  <SelectTrigger id="funder-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUNDER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {formatFunderType(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Contact Name</Label>
                <Input
                  id="contact-name"
                  value={form.contactName}
                  onChange={(e) => setField("contactName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Contact Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setField("contactEmail", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-phone">Contact Phone</Label>
                <Input
                  id="contact-phone"
                  value={form.contactPhone}
                  onChange={(e) => setField("contactPhone", e.target.value)}
                />
              </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address1">Address Line 1</Label>
                <Input
                  id="address1"
                  value={form.addressLine1}
                  onChange={(e) => setField("addressLine1", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address2">Address Line 2</Label>
                <Input
                  id="address2"
                  value={form.addressLine2}
                  onChange={(e) => setField("addressLine2", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  value={form.postcode}
                  onChange={(e) => setField("postcode", e.target.value)}
                />
              </div>
            </div>

            {/* Billing */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-terms">Payment Terms (days)</Label>
                <Input
                  id="payment-terms"
                  type="number"
                  min={1}
                  value={form.paymentTermsDays}
                  onChange={(e) => setField("paymentTermsDays", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-freq">Invoice Frequency</Label>
                <Select
                  value={form.invoiceFrequency}
                  onValueChange={(v) =>
                    setField("invoiceFrequency", v as InvoiceFrequency)
                  }
                >
                  <SelectTrigger id="invoice-freq">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVOICE_FREQUENCIES.map((f) => (
                      <SelectItem key={f} value={f}>
                        {formatInvoiceFrequency(f)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-basis">Billing Time Basis</Label>
                <Select
                  value={form.billingTimeBasis}
                  onValueChange={(v) =>
                    setField("billingTimeBasis", v as BillingTimeBasis)
                  }
                >
                  <SelectTrigger id="billing-basis">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_TIME_BASES.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b === "SCHEDULED" ? "Scheduled" : "Actual"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!form.name.trim() || isSaving}>
              {isSaving ? "Saving..." : editId ? "Update Funder" : "Create Funder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ---------- Render ----------

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Funders</h1>
          {funders && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {funders.length} {funders.length === 1 ? "funder" : "funders"}
            </p>
          )}
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Funder
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search funders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Payment Terms</TableHead>
              <TableHead>Invoice Frequency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            ) : !filtered.length ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Building2 className="h-8 w-8" />
                    <p className="text-sm">No funders found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((funder) => (
                <TableRow key={funder.id}>
                  <TableCell className="font-medium">{funder.name}</TableCell>
                  <TableCell>
                    <Badge variant={funderTypeBadgeVariant(funder.funderType)}>
                      {formatFunderType(funder.funderType)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {funder.contactName ?? "---"}
                    {funder.contactEmail && (
                      <span className="block text-xs">{funder.contactEmail}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {funder.paymentTermsDays ?? 30} days
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatInvoiceFrequency(funder.invoiceFrequency ?? "MONTHLY")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={funder.isActive ? "default" : "secondary"}
                      className={cn(
                        funder.isActive
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      {funder.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(funder)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(funder)}
                        disabled={updateMutation.isPending}
                      >
                        {funder.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Funder Dialog */}
      {renderFormDialog(addOpen, setAddOpen, "Add Funder")}

      {/* Edit Funder Dialog */}
      {renderFormDialog(!!editId, (v) => !v && setEditId(null), "Edit Funder")}
    </div>
  );
}

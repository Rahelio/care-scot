"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ShieldCheck,
  Plus,
  Pencil,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

// ── Types inferred from tRPC ─────────────────────────────────────────────────

type PvgRecord = {
  id: string;
  pvgMembershipNumber: string | null;
  pvgSchemeRecordDate: Date | null;
  pvgUpdateService: boolean;
  disclosureCertificateNumber: string | null;
  disclosureDate: Date | null;
  disclosureLevel: "ENHANCED" | "BASIC" | null;
  renewalDate: Date | null;
  createdAt: Date;
};

// ── Expiry helpers ───────────────────────────────────────────────────────────

export function getExpiryStatus(date: Date | null | undefined): "expired" | "warning" | "ok" | "none" {
  if (!date) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (d < today) return "expired";
  const ninety = new Date(today);
  ninety.setDate(ninety.getDate() + 90);
  if (d < ninety) return "warning";
  return "ok";
}

export function ExpiryBadge({ date, label }: { date: Date | null | undefined; label: string }) {
  const status = getExpiryStatus(date);
  if (status === "none") return <span className="text-muted-foreground text-sm">—</span>;
  const formatted = new Date(date!).toLocaleDateString("en-GB");
  if (status === "expired")
    return (
      <span className="inline-flex items-center gap-1 text-sm text-destructive font-medium">
        <AlertCircle className="h-3.5 w-3.5" />
        {label}: {formatted}
      </span>
    );
  if (status === "warning")
    return (
      <span className="inline-flex items-center gap-1 text-sm text-amber-600 font-medium">
        <AlertTriangle className="h-3.5 w-3.5" />
        {label}: {formatted}
      </span>
    );
  return <span className="text-sm text-muted-foreground">{label}: {formatted}</span>;
}

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
}

// ── PVG Section ──────────────────────────────────────────────────────────────

const pvgSchema = z.object({
  pvgMembershipNumber: z.string().optional(),
  pvgSchemeRecordDate: z.string().optional(),
  pvgUpdateService: z.boolean(),
  disclosureCertificateNumber: z.string().optional(),
  disclosureDate: z.string().optional(),
  disclosureLevel: z.enum(["ENHANCED", "BASIC", ""]).optional(),
  renewalDate: z.string().optional(),
});

type PvgForm = z.infer<typeof pvgSchema>;

function PvgDialog({
  open,
  onClose,
  staffMemberId,
  editing,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  staffMemberId: string;
  editing: PvgRecord | null;
  onSuccess: () => void;
}) {
  const form = useForm<PvgForm>({
    resolver: zodResolver(pvgSchema),
    defaultValues: {
      pvgMembershipNumber: editing?.pvgMembershipNumber ?? "",
      pvgSchemeRecordDate: editing?.pvgSchemeRecordDate
        ? new Date(editing.pvgSchemeRecordDate).toISOString().split("T")[0]
        : "",
      pvgUpdateService: editing?.pvgUpdateService ?? false,
      disclosureCertificateNumber: editing?.disclosureCertificateNumber ?? "",
      disclosureDate: editing?.disclosureDate
        ? new Date(editing.disclosureDate).toISOString().split("T")[0]
        : "",
      disclosureLevel: editing?.disclosureLevel ?? "",
      renewalDate: editing?.renewalDate
        ? new Date(editing.renewalDate).toISOString().split("T")[0]
        : "",
    },
  });

  const createMutation = trpc.staff.pvg.create.useMutation({
    onSuccess: () => { toast.success("PVG record added"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.staff.pvg.update.useMutation({
    onSuccess: () => { toast.success("PVG record updated"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  function onSubmit(values: PvgForm) {
    const payload = {
      pvgMembershipNumber: values.pvgMembershipNumber || undefined,
      pvgSchemeRecordDate: values.pvgSchemeRecordDate ? new Date(values.pvgSchemeRecordDate) : undefined,
      pvgUpdateService: values.pvgUpdateService,
      disclosureCertificateNumber: values.disclosureCertificateNumber || undefined,
      disclosureDate: values.disclosureDate ? new Date(values.disclosureDate) : undefined,
      disclosureLevel: (values.disclosureLevel || undefined) as "ENHANCED" | "BASIC" | undefined,
      renewalDate: values.renewalDate ? new Date(values.renewalDate) : undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload });
    } else {
      createMutation.mutate({ staffMemberId, ...payload });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit PVG Record" : "Add PVG Record"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pvgMembershipNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PVG Membership Number</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. PVG123456" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pvgSchemeRecordDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheme Record Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="renewalDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Renewal Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Separator />
            <FormField
              control={form.control}
              name="disclosureCertificateNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Disclosure Certificate Number</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. DC987654" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="disclosureDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disclosure Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="disclosureLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disclosure Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ENHANCED">Enhanced</SelectItem>
                        <SelectItem value="BASIC">Basic</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="pvgUpdateService"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">Enrolled in PVG Update Service</FormLabel>
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : editing ? "Save Changes" : "Add Record"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── List ─────────────────────────────────────────────────────────────────────

interface PvgListProps {
  staffId: string;
}

export function PvgList({ staffId }: PvgListProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PvgRecord | null>(null);
  const { data: records = [], refetch } = trpc.staff.pvg.getByStaff.useQuery({ staffMemberId: staffId });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" />
          PVG Disclosure
        </CardTitle>
        <Button
          size="sm"
          onClick={() => { setEditing(null); setOpen(true); }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Record
        </Button>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No PVG records on file.</p>
        ) : (
          <div className="divide-y">
            {records.map((r) => {
              const expiryStatus = getExpiryStatus(r.renewalDate);
              return (
                <div key={r.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.disclosureLevel && (
                        <Badge variant="secondary">
                          {r.disclosureLevel === "ENHANCED" ? "Enhanced" : "Basic"} Disclosure
                        </Badge>
                      )}
                      {r.pvgUpdateService && (
                        <Badge variant="outline">Update Service</Badge>
                      )}
                      {expiryStatus === "expired" && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                      {expiryStatus === "warning" && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                          Expires Soon
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 mt-2">
                      {r.pvgMembershipNumber && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Membership No: </span>
                          {r.pvgMembershipNumber}
                        </p>
                      )}
                      {r.disclosureCertificateNumber && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Certificate No: </span>
                          {r.disclosureCertificateNumber}
                        </p>
                      )}
                      <p className="text-sm">
                        <span className="text-muted-foreground">Scheme Record: </span>
                        {formatDate(r.pvgSchemeRecordDate)}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Disclosure Date: </span>
                        {formatDate(r.disclosureDate)}
                      </p>
                    </div>
                    <div className="mt-1">
                      <ExpiryBadge date={r.renewalDate} label="Renewal due" />
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => { setEditing(r as PvgRecord); setOpen(true); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <PvgDialog
        open={open}
        onClose={() => setOpen(false)}
        staffMemberId={staffId}
        editing={editing}
        onSuccess={refetch}
      />
    </Card>
  );
}

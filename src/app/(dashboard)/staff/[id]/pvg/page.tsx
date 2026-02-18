"use client";

import { use, useState } from "react";
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
  CheckCircle2,
  User,
  FileText,
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
import { Textarea } from "@/components/ui/textarea";
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

type Registration = {
  id: string;
  registrationType: "SSSC" | "NMC" | "OTHER";
  registrationNumber: string | null;
  registrationCategory: string | null;
  expiryDate: Date | null;
  qualificationName: string | null;
  createdAt: Date;
};

type Reference = {
  id: string;
  refereeName: string;
  refereeOrganisation: string | null;
  refereeRole: string | null;
  refereeContact: string | null;
  referenceType: "EMPLOYER" | "CHARACTER";
  referenceReceived: boolean;
  referenceDate: Date | null;
  employmentGapExplanation: string | null;
  createdAt: Date;
};

// ── Expiry helpers ───────────────────────────────────────────────────────────

function getExpiryStatus(date: Date | null | undefined): "expired" | "warning" | "ok" | "none" {
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

function ExpiryBadge({ date, label }: { date: Date | null | undefined; label: string }) {
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

function PvgSection({ staffMemberId }: { staffMemberId: string }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PvgRecord | null>(null);
  const { data: records = [], refetch } = trpc.staff.pvg.getByStaff.useQuery({ staffMemberId });

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
        staffMemberId={staffMemberId}
        editing={editing}
        onSuccess={refetch}
      />
    </Card>
  );
}

// ── Registration Section ──────────────────────────────────────────────────────

const registrationSchema = z.object({
  registrationType: z.enum(["SSSC", "NMC", "OTHER"]),
  registrationNumber: z.string().optional(),
  registrationCategory: z.string().optional(),
  expiryDate: z.string().optional(),
  qualificationName: z.string().optional(),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

function RegistrationDialog({
  open,
  onClose,
  staffMemberId,
  editing,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  staffMemberId: string;
  editing: Registration | null;
  onSuccess: () => void;
}) {
  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      registrationType: editing?.registrationType ?? "SSSC",
      registrationNumber: editing?.registrationNumber ?? "",
      registrationCategory: editing?.registrationCategory ?? "",
      expiryDate: editing?.expiryDate
        ? new Date(editing.expiryDate).toISOString().split("T")[0]
        : "",
      qualificationName: editing?.qualificationName ?? "",
    },
  });

  const createMutation = trpc.staff.registration.create.useMutation({
    onSuccess: () => { toast.success("Registration added"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.staff.registration.update.useMutation({
    onSuccess: () => { toast.success("Registration updated"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  function onSubmit(values: RegistrationForm) {
    const payload = {
      registrationType: values.registrationType as "SSSC" | "NMC" | "OTHER",
      registrationNumber: values.registrationNumber || undefined,
      registrationCategory: values.registrationCategory || undefined,
      expiryDate: values.expiryDate ? new Date(values.expiryDate) : undefined,
      qualificationName: values.qualificationName || undefined,
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
          <DialogTitle>{editing ? "Edit Registration" : "Add Registration"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="registrationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SSSC">SSSC</SelectItem>
                      <SelectItem value="NMC">NMC</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="registrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Number</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. 123456" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="registrationCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Category</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Support Worker" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="qualificationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qualification Name</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. SVQ Social Services" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : editing ? "Save Changes" : "Add Registration"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const REGISTRATION_LABEL: Record<string, string> = {
  SSSC: "SSSC",
  NMC: "NMC",
  OTHER: "Other",
};

function RegistrationSection({ staffMemberId }: { staffMemberId: string }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Registration | null>(null);
  const { data: records = [], refetch } = trpc.staff.registration.getByStaff.useQuery({ staffMemberId });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Professional Registrations
        </CardTitle>
        <Button
          size="sm"
          onClick={() => { setEditing(null); setOpen(true); }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Registration
        </Button>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No registrations on file.</p>
        ) : (
          <div className="divide-y">
            {records.map((r) => {
              const expiryStatus = getExpiryStatus(r.expiryDate);
              return (
                <div key={r.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{REGISTRATION_LABEL[r.registrationType]}</Badge>
                      {expiryStatus === "expired" && <Badge variant="destructive">Expired</Badge>}
                      {expiryStatus === "warning" && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                          Expires Soon
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 mt-2">
                      {r.registrationNumber && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Number: </span>
                          {r.registrationNumber}
                        </p>
                      )}
                      {r.registrationCategory && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Category: </span>
                          {r.registrationCategory}
                        </p>
                      )}
                      {r.qualificationName && (
                        <p className="text-sm col-span-2">
                          <span className="text-muted-foreground">Qualification: </span>
                          {r.qualificationName}
                        </p>
                      )}
                    </div>
                    <div className="mt-1">
                      <ExpiryBadge date={r.expiryDate} label="Expires" />
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => { setEditing(r as Registration); setOpen(true); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <RegistrationDialog
        open={open}
        onClose={() => setOpen(false)}
        staffMemberId={staffMemberId}
        editing={editing}
        onSuccess={refetch}
      />
    </Card>
  );
}

// ── Reference Section ─────────────────────────────────────────────────────────

const referenceSchema = z.object({
  refereeName: z.string().min(1, "Referee name is required"),
  refereeOrganisation: z.string().optional(),
  refereeRole: z.string().optional(),
  refereeContact: z.string().optional(),
  referenceType: z.enum(["EMPLOYER", "CHARACTER"]),
  referenceReceived: z.boolean(),
  referenceDate: z.string().optional(),
  employmentGapExplanation: z.string().optional(),
});

type ReferenceForm = z.infer<typeof referenceSchema>;

function ReferenceDialog({
  open,
  onClose,
  staffMemberId,
  editing,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  staffMemberId: string;
  editing: Reference | null;
  onSuccess: () => void;
}) {
  const form = useForm<ReferenceForm>({
    resolver: zodResolver(referenceSchema),
    defaultValues: {
      refereeName: editing?.refereeName ?? "",
      refereeOrganisation: editing?.refereeOrganisation ?? "",
      refereeRole: editing?.refereeRole ?? "",
      refereeContact: editing?.refereeContact ?? "",
      referenceType: editing?.referenceType ?? "EMPLOYER",
      referenceReceived: editing?.referenceReceived ?? false,
      referenceDate: editing?.referenceDate
        ? new Date(editing.referenceDate).toISOString().split("T")[0]
        : "",
      employmentGapExplanation: editing?.employmentGapExplanation ?? "",
    },
  });

  const createMutation = trpc.staff.reference.create.useMutation({
    onSuccess: () => { toast.success("Reference added"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.staff.reference.update.useMutation({
    onSuccess: () => { toast.success("Reference updated"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  function onSubmit(values: ReferenceForm) {
    const payload = {
      refereeName: values.refereeName,
      refereeOrganisation: values.refereeOrganisation || undefined,
      refereeRole: values.refereeRole || undefined,
      refereeContact: values.refereeContact || undefined,
      referenceType: values.referenceType as "EMPLOYER" | "CHARACTER",
      referenceReceived: values.referenceReceived,
      referenceDate: values.referenceDate ? new Date(values.referenceDate) : undefined,
      employmentGapExplanation: values.employmentGapExplanation || undefined,
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
          <DialogTitle>{editing ? "Edit Reference" : "Add Reference"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="refereeName"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Referee Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input {...field} placeholder="Full name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="refereeOrganisation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organisation</FormLabel>
                    <FormControl><Input {...field} placeholder="Employer / organisation" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="refereeRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referee Role / Title</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Manager" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="refereeContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact (email / phone)</FormLabel>
                    <FormControl><Input {...field} placeholder="contact details" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="referenceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EMPLOYER">Employer</SelectItem>
                        <SelectItem value="CHARACTER">Character</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex items-center gap-6">
              <FormField
                control={form.control}
                name="referenceReceived"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">Reference received</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="referenceDate"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Date Received</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="employmentGapExplanation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employment Gap Explanation</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Explain any gaps in employment history…" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : editing ? "Save Changes" : "Add Reference"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ReferenceSection({ staffMemberId }: { staffMemberId: string }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reference | null>(null);
  const { data: records = [], refetch } = trpc.staff.reference.getByStaff.useQuery({ staffMemberId });

  const receivedCount = records.filter((r) => r.referenceReceived).length;
  const needsWarning = receivedCount < 2;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="h-4 w-4" />
          References
          <span className="text-xs font-normal text-muted-foreground ml-1">
            ({receivedCount} received, target 2+)
          </span>
        </CardTitle>
        <Button
          size="sm"
          onClick={() => { setEditing(null); setOpen(true); }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Reference
        </Button>
      </CardHeader>
      <CardContent>
        {needsWarning && (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 mb-4">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {receivedCount === 0
                ? "No references received yet. At least 2 are required before employment."
                : `Only ${receivedCount} reference${receivedCount === 1 ? "" : "s"} received. At least 2 are required.`}
            </span>
          </div>
        )}
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No references on file.</p>
        ) : (
          <div className="divide-y">
            {records.map((r) => (
              <div key={r.id} className="py-4 flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{r.refereeName}</span>
                    <Badge variant={r.referenceType === "EMPLOYER" ? "secondary" : "outline"}>
                      {r.referenceType === "EMPLOYER" ? "Employer" : "Character"}
                    </Badge>
                    {r.referenceReceived ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Received {r.referenceDate ? formatDate(r.referenceDate) : ""}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Not yet received
                      </span>
                    )}
                  </div>
                  {(r.refereeOrganisation || r.refereeRole) && (
                    <p className="text-sm text-muted-foreground">
                      {[r.refereeRole, r.refereeOrganisation].filter(Boolean).join(" — ")}
                    </p>
                  )}
                  {r.refereeContact && (
                    <p className="text-sm text-muted-foreground">{r.refereeContact}</p>
                  )}
                  {r.employmentGapExplanation && (
                    <details className="mt-1">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        Employment gap explanation
                      </summary>
                      <p className="text-sm mt-1 text-muted-foreground pl-2 border-l-2">
                        {r.employmentGapExplanation}
                      </p>
                    </details>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => { setEditing(r as Reference); setOpen(true); }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <ReferenceDialog
        open={open}
        onClose={() => setOpen(false)}
        staffMemberId={staffMemberId}
        editing={editing}
        onSuccess={refetch}
      />
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function StaffPvgPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="space-y-6">
      <PvgSection staffMemberId={id} />
      <RegistrationSection staffMemberId={id} />
      <ReferenceSection staffMemberId={id} />
    </div>
  );
}

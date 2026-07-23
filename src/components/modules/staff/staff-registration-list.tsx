"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, FileText } from "lucide-react";

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
import { getExpiryStatus, ExpiryBadge } from "./pvg-list";

// ── Types inferred from tRPC ─────────────────────────────────────────────────

type Registration = {
  id: string;
  registrationType: "SSSC" | "NMC" | "OTHER";
  registrationNumber: string | null;
  registrationCategory: string | null;
  expiryDate: Date | null;
  qualificationName: string | null;
  createdAt: Date;
};

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

// ── List ─────────────────────────────────────────────────────────────────────

interface StaffRegistrationListProps {
  staffId: string;
}

export function StaffRegistrationList({ staffId }: StaffRegistrationListProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Registration | null>(null);
  const { data: records = [], refetch } = trpc.staff.registration.getByStaff.useQuery({ staffMemberId: staffId });

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
        staffMemberId={staffId}
        editing={editing}
        onSuccess={refetch}
      />
    </Card>
  );
}

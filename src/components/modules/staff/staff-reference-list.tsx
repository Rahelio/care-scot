"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  User,
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

// ── Types inferred from tRPC ─────────────────────────────────────────────────

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

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
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

// ── List ─────────────────────────────────────────────────────────────────────

interface StaffReferenceListProps {
  staffId: string;
}

export function StaffReferenceList({ staffId }: StaffReferenceListProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reference | null>(null);
  const { data: records = [], refetch } = trpc.staff.reference.getByStaff.useQuery({ staffMemberId: staffId });

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
        staffMemberId={staffId}
        editing={editing}
        onSuccess={refetch}
      />
    </Card>
  );
}

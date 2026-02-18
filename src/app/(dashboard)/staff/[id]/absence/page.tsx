"use client";

import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarOff, Plus, Pencil, AlertTriangle } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

// ── Types & helpers ───────────────────────────────────────────────────────────

type AbsenceRecord = {
  id: string;
  absenceType: string;
  startDate: Date;
  endDate: Date | null;
  totalDays: unknown;
  reason: string | null;
  returnToWorkInterview: boolean;
  rtwDate: Date | null;
  rtwNotes: string | null;
};

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
}

function autoCalcDays(start: string, end: string): string {
  if (!start || !end) return "";
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (e < s) return "";
  const days = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
  return String(days);
}

const ABSENCE_TYPE_LABELS: Record<string, string> = {
  SICK: "Sick",
  HOLIDAY: "Holiday",
  UNAUTHORISED: "Unauthorised",
  OTHER: "Other",
};

const TYPE_BADGE_CLASS: Record<string, string> = {
  SICK: "bg-red-50 text-red-700 border-red-200",
  HOLIDAY: "bg-blue-50 text-blue-700 border-blue-200",
  UNAUTHORISED: "bg-orange-50 text-orange-700 border-orange-200",
  OTHER: "bg-muted text-muted-foreground",
};

// ── Bradford score indicator ──────────────────────────────────────────────────

function BradfordBadge({ score }: { score: number }) {
  if (score === 0) return <span className="text-sm text-green-700 font-medium">0</span>;
  if (score < 51) return <span className="text-sm text-amber-600 font-medium">{score} (Low)</span>;
  if (score < 201) return <span className="text-sm text-orange-600 font-medium">{score} (Medium)</span>;
  return <span className="text-sm text-destructive font-medium">{score} (High)</span>;
}

// ── Absence dialog ────────────────────────────────────────────────────────────

const absenceSchema = z.object({
  absenceType: z.enum(["SICK", "HOLIDAY", "UNAUTHORISED", "OTHER"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  totalDays: z.string().optional(),
  reason: z.string().optional(),
  returnToWorkInterview: z.boolean(),
  rtwDate: z.string().optional(),
  rtwNotes: z.string().optional(),
});

type AbsenceForm = z.infer<typeof absenceSchema>;

function AbsenceDialog({
  open, onClose, staffMemberId, editing, onSuccess,
}: {
  open: boolean; onClose: () => void; staffMemberId: string;
  editing: AbsenceRecord | null; onSuccess: () => void;
}) {
  const form = useForm<AbsenceForm>({
    resolver: zodResolver(absenceSchema),
    defaultValues: {
      absenceType: (editing?.absenceType as AbsenceForm["absenceType"]) ?? "SICK",
      startDate: editing?.startDate ? new Date(editing.startDate).toISOString().split("T")[0] : "",
      endDate: editing?.endDate ? new Date(editing.endDate).toISOString().split("T")[0] : "",
      totalDays: editing?.totalDays != null ? String(Number(editing.totalDays)) : "",
      reason: editing?.reason ?? "",
      returnToWorkInterview: editing?.returnToWorkInterview ?? false,
      rtwDate: editing?.rtwDate ? new Date(editing.rtwDate).toISOString().split("T")[0] : "",
      rtwNotes: editing?.rtwNotes ?? "",
    },
  });

  const absenceType = form.watch("absenceType");
  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");

  // Auto-fill total days
  const suggestedDays = autoCalcDays(startDate, endDate ?? "");

  const createMut = trpc.staff.absence.create.useMutation({
    onSuccess: () => { toast.success("Absence recorded"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.staff.absence.update.useMutation({
    onSuccess: () => { toast.success("Absence updated"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  function onSubmit(v: AbsenceForm) {
    const days = parseFloat(v.totalDays || suggestedDays || "0") || undefined;
    const payload = {
      absenceType: v.absenceType as never,
      startDate: new Date(v.startDate),
      endDate: v.endDate ? new Date(v.endDate) : undefined,
      totalDays: days,
      reason: v.reason || undefined,
      returnToWorkInterview: v.returnToWorkInterview,
      rtwDate: v.rtwDate ? new Date(v.rtwDate) : undefined,
      rtwNotes: v.rtwNotes || undefined,
    };
    if (editing) {
      updateMut.mutate({ id: editing.id, ...payload });
    } else {
      createMut.mutate({ staffMemberId, ...payload });
    }
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Absence" : "Record Absence"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="absenceType" render={({ field }) => (
              <FormItem>
                <FormLabel>Absence Type <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {Object.entries(ABSENCE_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-3 gap-3">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="totalDays" render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Days</FormLabel>
                  <FormControl>
                    <Input {...field}
                      placeholder={suggestedDays || "auto"}
                      type="number"
                      step="0.5"
                      min="0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>Reason</FormLabel>
                <FormControl><Textarea {...field} rows={2} placeholder="Reason for absence…" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {absenceType === "SICK" && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-medium">Return to Work Interview</p>
                  <FormField control={form.control} name="returnToWorkInterview" render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal">RTW interview completed</FormLabel>
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="rtwDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>RTW Interview Date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="rtwNotes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>RTW Notes</FormLabel>
                      <FormControl><Textarea {...field} rows={2} placeholder="Return to work discussion notes…" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : editing ? "Save Changes" : "Record Absence"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function StaffAbsencePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AbsenceRecord | null>(null);

  const { data: absences = [], refetch } = trpc.staff.absence.getByStaff.useQuery({ staffMemberId: id });
  const { data: summary } = trpc.staff.absence.getSummary.useQuery({ staffMemberId: id });

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold">{summary?.sickDays.toFixed(1) ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total sick days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold">{summary?.holidayDays.toFixed(1) ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total holiday days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-2xl font-bold">{summary?.sickEpisodesLast52Weeks ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Sick episodes (52 wks)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <BradfordBadge score={summary?.bradfordScore ?? 0} />
            <p className="text-xs text-muted-foreground mt-0.5">Bradford Score</p>
            <p className="text-xs text-muted-foreground/60">B²×D (52-week)</p>
          </CardContent>
        </Card>
      </div>

      {/* Bradford warning */}
      {summary && summary.bradfordScore >= 201 && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Bradford Score of {summary.bradfordScore} — formal review recommended.
        </div>
      )}

      {/* Records table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarOff className="h-4 w-4" />
            Absence Records
          </CardTitle>
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />Record Absence
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {absences.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No absence records.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead>RTW</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {absences.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Badge className={`text-xs ${TYPE_BADGE_CLASS[a.absenceType] ?? ""}`}>
                        {ABSENCE_TYPE_LABELS[a.absenceType] ?? a.absenceType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(a.startDate)}</TableCell>
                    <TableCell className="text-sm">{formatDate(a.endDate)}</TableCell>
                    <TableCell className="text-sm text-right">
                      {a.totalDays != null ? Number(a.totalDays).toFixed(1) : "—"}
                    </TableCell>
                    <TableCell>
                      {a.absenceType === "SICK" && (
                        <Badge variant={a.returnToWorkInterview ? "secondary" : "outline"} className="text-xs">
                          {a.returnToWorkInterview ? "Done" : "Pending"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => { setEditing(a as AbsenceRecord); setOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AbsenceDialog
        open={open}
        onClose={() => setOpen(false)}
        staffMemberId={id}
        editing={editing}
        onSuccess={() => { refetch(); }}
      />
    </div>
  );
}

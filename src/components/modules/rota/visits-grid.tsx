"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, UserMinus, CalendarDays } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { isSameDay } from "@/lib/date-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { StaffOption } from "./staff-matrix";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_COLORS: Record<string, string> = {
  UNASSIGNED: "bg-orange-100 text-orange-800 border-orange-200",
  PARTIALLY_ASSIGNED: "bg-blue-100 text-blue-800 border-blue-200",
  ASSIGNED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

export interface RotaVisitRow {
  id: string;
  visitDate: Date;
  startTime: string;
  endTime: string;
  carersRequired: number;
  status: string;
  serviceUser: { id: string; firstName: string; lastName: string };
  assignments: { staffMember: { id: string; firstName: string; lastName: string } }[];
}

interface ConflictEntry {
  rotaVisitId: string;
  staffMemberId: string;
  conflicts: { message: string }[];
}

interface Props {
  weekDays: Date[];
  visits: RotaVisitRow[];
  staff: StaffOption[];
  onMutated: () => void;
}

export function VisitsGrid({ weekDays, visits, staff, onMutated }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [conflicts, setConflicts] = useState<ConflictEntry[] | null>(null);

  const bulkAssignMut = trpc.rota.assignments.bulkAssign.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const bulkUnassignMut = trpc.rota.assignments.bulkUnassign.useMutation({
    onError: (e) => toast.error(e.message),
  });

  function staffName(id: string): string {
    const s = staff.find((m) => m.id === id);
    return s ? `${s.firstName} ${s.lastName}` : "Staff member";
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(selectedIds.size === visits.length ? new Set() : new Set(visits.map((v) => v.id)));
  }

  function toggleSelectDay(dayVisits: RotaVisitRow[]) {
    const ids = dayVisits.map((v) => v.id);
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function toggleStaffSelect(id: string) {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function closeAssignDialog() {
    setAssignOpen(false);
    setSelectedStaffIds(new Set());
    setConflicts(null);
  }

  async function submitAssign(overrideConflict: boolean) {
    try {
      const result = await bulkAssignMut.mutateAsync({
        rotaVisitIds: [...selectedIds],
        staffMemberIds: [...selectedStaffIds],
        overrideConflict,
      });
      if (!result.applied) {
        setConflicts(result.conflicts);
        return;
      }
      toast.success("Staff assigned");
      onMutated();
      setSelectedIds(new Set());
      closeAssignDialog();
    } catch {
      // onError handles the toast
    }
  }

  async function handleUnassignAll() {
    try {
      await bulkUnassignMut.mutateAsync({ rotaVisitIds: [...selectedIds] });
      toast.success("Staff unassigned");
      onMutated();
      setSelectedIds(new Set());
    } catch {
      // onError handles the toast
    }
  }

  const today = new Date();
  const allSelected = visits.length > 0 && selectedIds.size === visits.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b">
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={toggleSelectAll}
            disabled={visits.length === 0}
          />
          <span className="text-muted-foreground">
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
          </span>
        </label>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              Assign staff…
            </Button>
            <Button size="sm" variant="outline" onClick={handleUnassignAll} disabled={bulkUnassignMut.isPending}>
              <UserMinus className="h-3.5 w-3.5 mr-1" />
              Unassign all
            </Button>
          </div>
        )}
      </div>

      {visits.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-8 text-center">
          <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium text-sm">No visits scheduled this week</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add visits from a client&apos;s Rota tab to see them here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {weekDays.map((day, i) => {
            const dayVisits = visits.filter((v) => isSameDay(new Date(v.visitDate), day));
            const isToday = isSameDay(day, today);
            const allDaySelected = dayVisits.length > 0 && dayVisits.every((v) => selectedIds.has(v.id));
            const someDaySelected = dayVisits.some((v) => selectedIds.has(v.id)) && !allDaySelected;

            return (
              <div
                key={i}
                className={cn("rounded-lg border min-h-[10rem] p-2 flex flex-col", isToday && "ring-2 ring-primary/30")}
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    {dayVisits.length > 0 && (
                      <Checkbox
                        checked={allDaySelected ? true : someDaySelected ? "indeterminate" : false}
                        onCheckedChange={() => toggleSelectDay(dayVisits)}
                      />
                    )}
                    <span className="text-xs font-medium text-muted-foreground">{DAY_LABELS[i]}</span>
                  </label>
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      isToday && "bg-primary text-primary-foreground rounded-full px-1.5 py-0.5",
                    )}
                  >
                    {day.getDate()}
                  </span>
                </div>
                <div className="flex-1 space-y-1.5">
                  {dayVisits.map((visit) => (
                    <div
                      key={visit.id}
                      className={cn(
                        "rounded border px-2 py-1.5 text-xs cursor-pointer",
                        STATUS_COLORS[visit.status] ?? "bg-muted",
                        selectedIds.has(visit.id) && "ring-2 ring-primary/50",
                      )}
                      onClick={() => toggleSelect(visit.id)}
                    >
                      <div className="flex items-start gap-1">
                        <Checkbox
                          className="mt-0.5"
                          checked={selectedIds.has(visit.id)}
                          onCheckedChange={() => toggleSelect(visit.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {visit.serviceUser.firstName} {visit.serviceUser.lastName}
                          </p>
                          <p className="text-[10px] opacity-75">
                            {visit.startTime}–{visit.endTime}
                          </p>
                          <p className="text-[10px] opacity-75">
                            {visit.assignments.length}/{visit.carersRequired} assigned
                          </p>
                          {visit.assignments.map((a) => (
                            <p key={a.staffMember.id} className="text-[10px] opacity-75 truncate">
                              {a.staffMember.firstName} {a.staffMember.lastName}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {dayVisits.length === 0 && (
                    <p className="text-[10px] text-muted-foreground/50 text-center pt-4">No visits</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_COLORS).map(([status, cls]) => (
          <Badge key={status} variant="outline" className={cn("text-[10px]", cls)}>
            {status.replace(/_/g, " ")}
          </Badge>
        ))}
      </div>

      <Dialog open={assignOpen} onOpenChange={(v) => !v && closeAssignDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign staff to {selectedIds.size} visit{selectedIds.size !== 1 ? "s" : ""}</DialogTitle>
          </DialogHeader>

          {conflicts ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Some selected staff have a scheduling conflict. You can still assign them anyway.
              </p>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {conflicts.map((c, idx) => (
                  <div key={idx} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                    <p className="font-medium">{staffName(c.staffMemberId)}</p>
                    {c.conflicts.map((conflict, cidx) => (
                      <p key={cidx} className="text-xs text-muted-foreground">{conflict.message}</p>
                    ))}
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConflicts(null)}>Back</Button>
                <Button
                  variant="destructive"
                  disabled={bulkAssignMut.isPending}
                  onClick={() => submitAssign(true)}
                >
                  Assign anyway
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {staff.map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center gap-2 cursor-pointer select-none rounded px-1 py-1 hover:bg-muted/60 transition-colors"
                  >
                    <Checkbox
                      checked={selectedStaffIds.has(member.id)}
                      onCheckedChange={() => toggleStaffSelect(member.id)}
                    />
                    <span className="text-sm">{member.firstName} {member.lastName}</span>
                  </label>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeAssignDialog}>Cancel</Button>
                <Button
                  disabled={selectedStaffIds.size === 0 || bulkAssignMut.isPending}
                  onClick={() => submitAssign(false)}
                >
                  Assign
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

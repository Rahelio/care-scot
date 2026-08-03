"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CircleCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { StaffOption } from "./staff-matrix";
import type { RotaVisitRow } from "@/lib/rota-scheduling";

interface ConflictEntry {
  rotaVisitId: string;
  staffMemberId: string;
  conflicts: { type: string; message: string }[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visits: RotaVisitRow[];
  staff: StaffOption[];
  onAssigned: () => void;
}

function fullName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`;
}

/**
 * Shared assign-staff dialog: shows a live availability/conflict preview per
 * staff member (via checkAvailability), and a dry-run/override flow on
 * submit (bulkAssign returns {applied:false, conflicts} without writing if
 * conflicts exist and override wasn't set, so this can show a confirmation
 * screen before committing). Used both for a multi-visit selection (Visits
 * view) and a single clicked visit (Timeline view) — callers just pass
 * whichever `visits` they want staff assigned to.
 */
export function AssignVisitsDialog({ open, onOpenChange, visits, staff, onAssigned }: Props) {
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [conflicts, setConflicts] = useState<ConflictEntry[] | null>(null);

  const bulkAssignMut = trpc.rota.assignments.bulkAssign.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const { data: availabilityPreview, isPending: isCheckingAvailability } =
    trpc.rota.assignments.checkAvailability.useQuery(
      { rotaVisitIds: visits.map((v) => v.id) },
      { enabled: open && visits.length > 0 },
    );

  function staffName(id: string): string {
    const s = staff.find((m) => m.id === id);
    return s ? fullName(s) : "Staff member";
  }

  function toggleStaffSelect(id: string) {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function close() {
    onOpenChange(false);
    setSelectedStaffIds(new Set());
    setConflicts(null);
  }

  async function submitAssign(overrideConflict: boolean) {
    try {
      const result = await bulkAssignMut.mutateAsync({
        rotaVisitIds: visits.map((v) => v.id),
        staffMemberIds: [...selectedStaffIds],
        overrideConflict,
      });
      if (!result.applied) {
        setConflicts(result.conflicts);
        return;
      }
      toast.success("Staff assigned");
      onAssigned();
      close();
    } catch {
      // onError handles the toast
    }
  }

  function StaffRow({ member }: { member: StaffOption }) {
    const memberConflicts = availabilityPreview?.find((r) => r.staffMemberId === member.id)?.conflicts ?? [];
    // A staff member already assigned to another overlapping visit can't
    // physically also do this one — unlike a leave/availability warning,
    // this isn't a judgment call, so selecting them is blocked outright.
    const doubleBooked = memberConflicts.some((c) => c.type === "DOUBLE_BOOKED");
    return (
      <label
        className={cn(
          "flex items-start gap-3 select-none rounded px-2 py-2 transition-colors",
          doubleBooked ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-muted/60",
        )}
      >
        <Checkbox
          className="h-5 w-5 mt-0.5"
          checked={selectedStaffIds.has(member.id)}
          disabled={doubleBooked}
          onCheckedChange={() => toggleStaffSelect(member.id)}
        />
        <div className="flex-1 min-w-0">
          <span className="text-base">{fullName(member)}</span>
          {availabilityPreview && (
            memberConflicts.length === 0 ? (
              <p className="flex items-center gap-1 text-sm text-green-700 mt-0.5">
                <CircleCheck className="h-4 w-4 shrink-0" />
                Available
              </p>
            ) : (
              <div className="mt-0.5 space-y-0.5">
                {memberConflicts.map((c, idx) => (
                  <p
                    key={idx}
                    className={cn(
                      "flex items-start gap-1 text-sm",
                      c.type === "DOUBLE_BOOKED" ? "text-red-700 font-medium" : "text-amber-700",
                    )}
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="break-words">{c.message}</span>
                  </p>
                ))}
              </div>
            )
          )}
        </div>
      </label>
    );
  }

  const areasInSelection = new Set(visits.map((v) => v.serviceUser.area).filter((a): a is string => Boolean(a)));
  const commonArea = areasInSelection.size === 1 ? [...areasInSelection][0] : null;
  const hardBlocked = conflicts?.some((c) => c.conflicts.some((x) => x.type === "DOUBLE_BOOKED")) ?? false;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Assign staff to {visits.length} visit{visits.length !== 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>

        {conflicts ? (
          <div className="space-y-3">
            <p className="text-base text-muted-foreground">
              {hardBlocked
                ? "One or more selected staff members are already assigned to another visit that overlaps this time — that can't be overridden. Go back and remove them from your selection."
                : "Some selected staff have a scheduling conflict. You can still assign them anyway."}
            </p>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {conflicts.map((c, idx) => {
                const entryHardBlocked = c.conflicts.some((x) => x.type === "DOUBLE_BOOKED");
                return (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-md border px-4 py-3",
                      entryHardBlocked ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50",
                    )}
                  >
                    <p className="flex items-center gap-2 font-semibold text-base">
                      <AlertTriangle className={cn("h-4 w-4", entryHardBlocked ? "text-red-600" : "text-amber-600")} />
                      {staffName(c.staffMemberId)}
                    </p>
                    {c.conflicts.map((conflict, cidx) => (
                      <p key={cidx} className="text-sm text-muted-foreground pl-6">{conflict.message}</p>
                    ))}
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button size="lg" variant="outline" onClick={() => setConflicts(null)}>Back</Button>
              {!hardBlocked && (
                <Button
                  size="lg"
                  variant="destructive"
                  disabled={bulkAssignMut.isPending}
                  onClick={() => submitAssign(true)}
                >
                  Assign anyway
                </Button>
              )}
            </DialogFooter>
          </div>
        ) : (
          <>
            {isCheckingAvailability && (
              <p className="text-sm text-muted-foreground">Checking availability…</p>
            )}
            <div className="max-h-72 overflow-y-auto space-y-1">
              {!commonArea ? (
                staff.map((member) => <StaffRow key={member.id} member={member} />)
              ) : (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Same area — {commonArea}
                  </p>
                  {staff.filter((m) => m.area === commonArea).map((member) => <StaffRow key={member.id} member={member} />)}
                  {staff.some((m) => m.area !== commonArea) && (
                    <>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-3 mb-1">
                        Other staff
                      </p>
                      {staff.filter((m) => m.area !== commonArea).map((member) => <StaffRow key={member.id} member={member} />)}
                    </>
                  )}
                </>
              )}
            </div>
            <DialogFooter>
              <Button size="lg" variant="outline" onClick={close}>Cancel</Button>
              <Button
                size="lg"
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
  );
}

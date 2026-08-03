"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, UserMinus, AlertTriangle, Clock, CalendarX2, ChevronDown, ChevronRight, Search, Users2, Wand2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { isSameDay, formatShort, dayOfWeekName } from "@/lib/date-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { StaffOption, AvailabilityRow, LeaveRow } from "./staff-matrix";
import { type RotaVisitRow, findContinuityIssues, computeVisitGaps, buildRounds, needsAttention, visitStatusInfo } from "@/lib/rota-scheduling";
import { AssignVisitsDialog } from "./assign-visits-dialog";

const ABSENCE_LABELS: Record<string, string> = {
  SICK: "Sick leave",
  HOLIDAY: "Holiday leave",
  UNAUTHORISED: "Unauthorised absence",
  OTHER: "Leave",
};

const TIME_BANDS = [
  { key: "morning", label: "Morning", test: (t: string) => t < "12:00" },
  { key: "afternoon", label: "Afternoon", test: (t: string) => t >= "12:00" && t < "17:00" },
  { key: "evening", label: "Evening", test: (t: string) => t >= "17:00" },
] as const;

export type { RotaVisitRow };

interface Props {
  selectedDay: Date;
  visits: RotaVisitRow[];
  staff: StaffOption[];
  availability: AvailabilityRow[];
  leave: LeaveRow[];
  onMutated: () => void;
}

function fullName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`;
}

/** A staff member's card stays expanded while any of their visits that day
 * still needs more carers assigned — collapsing is only for rows with
 * nothing left to act on. */
export function DayVisitAssignmentList({ selectedDay, visits, staff, availability, leave, onMutated }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignOpen, setAssignOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expandOverrides, setExpandOverrides] = useState<Map<string, boolean>>(new Map());
  const [collapsedBands, setCollapsedBands] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<"time" | "area">("time");
  const [skippedResults, setSkippedResults] = useState<{ rotaVisitId: string; reason: string }[]>([]);
  const [dayForOverrides, setDayForOverrides] = useState(selectedDay);

  // A new day means a fresh set of default-collapsed/expanded rows. Reset
  // during render (not an effect) per React's "adjusting state when a prop
  // changes" pattern — avoids an extra render pass from a setState-in-effect.
  if (selectedDay !== dayForOverrides) {
    setDayForOverrides(selectedDay);
    setExpandOverrides(new Map());
    setCollapsedBands(new Set());
  }

  const bulkUnassignMut = trpc.rota.assignments.bulkUnassign.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const autoAssignMut = trpc.rota.assignments.autoAssign.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const dayVisits = visits.filter((v) => isSameDay(new Date(v.visitDate), selectedDay));
  const activeDayVisits = dayVisits.filter((v) => v.status !== "CANCELLED");
  const cancelledCount = dayVisits.length - activeDayVisits.length;
  const unassignedVisits = activeDayVisits.filter((v) => v.assignments.length === 0);

  const staffVisitsMap = new Map<string, RotaVisitRow[]>();
  for (const visit of activeDayVisits) {
    for (const assignment of visit.assignments) {
      const list = staffVisitsMap.get(assignment.staffMember.id) ?? [];
      list.push(visit);
      staffVisitsMap.set(assignment.staffMember.id, list);
    }
  }

  const continuityIssues = findContinuityIssues(activeDayVisits);
  const continuityClientIds = new Set(continuityIssues.map((i) => i.serviceUser.id));

  const dayOfWeek = dayOfWeekName(selectedDay);

  const q = query.trim().toLowerCase();
  const isSearching = q.length > 0;
  function matches(name: string): boolean {
    return name.toLowerCase().includes(q);
  }

  const visibleUnassigned = unassignedVisits.filter((v) => !isSearching || matches(fullName(v.serviceUser)));
  const visibleStaff = staff.filter((member) => {
    if (!isSearching) return true;
    if (matches(fullName(member))) return true;
    return (staffVisitsMap.get(member.id) ?? []).some((v) => matches(fullName(v.serviceUser)));
  });
  const noMatches = isSearching && visibleUnassigned.length === 0 && visibleStaff.length === 0;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(selectedIds.size === activeDayVisits.length ? new Set() : new Set(activeDayVisits.map((v) => v.id)));
  }

  function toggleSelectGroup(groupVisits: RotaVisitRow[]) {
    const ids = groupVisits.map((v) => v.id);
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function toggleBand(key: string) {
    setCollapsedBands((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleStaffExpanded(memberId: string, currentlyExpanded: boolean) {
    setExpandOverrides((prev) => new Map(prev).set(memberId, !currentlyExpanded));
  }

  async function handleUnassignAll() {
    try {
      await bulkUnassignMut.mutateAsync({ rotaVisitIds: [...selectedIds] });
      toast.success("Staff removed from selected visits");
      onMutated();
      setSelectedIds(new Set());
    } catch {
      // onError handles the toast
    }
  }

  function selectAndAssignRound(roundVisits: RotaVisitRow[]) {
    setSelectedIds(new Set(roundVisits.map((v) => v.id)));
    setAssignOpen(true);
  }

  async function handleAutoAssign() {
    try {
      const result = await autoAssignMut.mutateAsync({ rotaVisitIds: unassignedVisits.map((v) => v.id) });
      setSkippedResults(result.skipped);
      if (result.assignedCount === 0 && result.skipped.length === 0) {
        toast.success("Nothing to assign — no unassigned visits today");
      } else {
        toast.success(
          `Auto-assigned ${result.assignedCount} of ${unassignedVisits.length} visit${unassignedVisits.length !== 1 ? "s" : ""}` +
            (result.softConflictCount > 0 ? ` (${result.softConflictCount} outside usual availability)` : ""),
        );
      }
      onMutated();
    } catch {
      // onError handles the toast
    }
  }

  const weekUnassignedVisits = visits.filter((v) => v.status !== "CANCELLED" && v.assignments.length === 0);

  async function handleAutoAssignWeek() {
    try {
      const result = await autoAssignMut.mutateAsync({ rotaVisitIds: weekUnassignedVisits.map((v) => v.id) });
      setSkippedResults(result.skipped);
      if (result.assignedCount === 0 && result.skipped.length === 0) {
        toast.success("Nothing to assign — no unassigned visits this week");
      } else {
        toast.success(
          `Auto-assigned ${result.assignedCount} of ${weekUnassignedVisits.length} visit${weekUnassignedVisits.length !== 1 ? "s" : ""} this week` +
            (result.softConflictCount > 0 ? ` (${result.softConflictCount} outside usual availability)` : ""),
        );
      }
      onMutated();
    } catch {
      // onError handles the toast
    }
  }

  const allSelected = activeDayVisits.length > 0 && selectedIds.size === activeDayVisits.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  function VisitEntry({ visit }: { visit: RotaVisitRow }) {
    const status = visitStatusInfo(visit);
    return (
      <label className="flex items-start gap-3 rounded-md border px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors">
        <Checkbox
          className="mt-1 h-5 w-5"
          checked={selectedIds.has(visit.id)}
          onCheckedChange={() => toggleSelect(visit.id)}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-base font-semibold break-words">{fullName(visit.serviceUser)}</p>
          <p className="flex items-center gap-1.5 text-base tabular-nums text-muted-foreground">
            <Clock className="h-4 w-4" />
            {visit.startTime}–{visit.endTime}
          </p>
          <Badge variant="outline" className={cn("text-xs", status.className)}>
            {status.label}
          </Badge>
          {continuityClientIds.has(visit.serviceUser.id) && (
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300 block w-fit">
              Different carer on another visit today
            </Badge>
          )}
        </div>
      </label>
    );
  }

  function StaffCard({ member }: { member: StaffOption }) {
    const memberVisits = staffVisitsMap.get(member.id) ?? [];
    const visitGaps = computeVisitGaps(memberVisits);
    const memberAvailability = availability.filter(
      (a) => a.staffMemberId === member.id && a.dayOfWeek === dayOfWeek &&
        new Date(a.effectiveFrom) <= selectedDay && (!a.effectiveTo || new Date(a.effectiveTo) >= selectedDay),
    );
    const memberLeave = leave.filter(
      (l) => l.staffMemberId === member.id &&
        new Date(l.startDate) <= selectedDay && (!l.endDate || new Date(l.endDate) >= selectedDay),
    );

    const override = expandOverrides.get(member.id);
    const expanded = isSearching ? true : override !== undefined ? override : needsAttention(memberVisits);

    const statusBadges = (
      <div className="flex items-center gap-1.5 flex-wrap">
        {memberLeave.map((l, idx) => (
          <Badge key={idx} variant="outline" className="bg-red-50 text-red-700 border-red-300 text-xs">
            {ABSENCE_LABELS[l.absenceType] ?? l.absenceType}
            {!l.approvedBy && " (pending approval)"}
          </Badge>
        ))}
        {memberAvailability.length > 0 && memberLeave.length === 0 && (
          <Badge variant="outline" className="text-xs">
            Available {memberAvailability.map((a) => `${a.availableFrom}–${a.availableTo}`).join(", ")}
          </Badge>
        )}
      </div>
    );

    if (!expanded) {
      return (
        <button
          type="button"
          onClick={() => toggleStaffExpanded(member.id, expanded)}
          className="w-full flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="text-base font-semibold truncate">{fullName(member)}</span>
            <span className="text-sm text-muted-foreground shrink-0">
              {memberVisits.length > 0
                ? `${memberVisits.length} visit${memberVisits.length !== 1 ? "s" : ""} today`
                : "No visits today"}
            </span>
          </div>
          {statusBadges}
        </button>
      );
    }

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 py-3 flex-wrap">
          <div className="flex items-center gap-3">
            {memberVisits.length > 0 && (
              <Checkbox
                className="h-5 w-5"
                checked={memberVisits.every((v) => selectedIds.has(v.id)) ? true : memberVisits.some((v) => selectedIds.has(v.id)) ? "indeterminate" : false}
                onCheckedChange={() => toggleSelectGroup(memberVisits)}
              />
            )}
            <button
              type="button"
              onClick={() => toggleStaffExpanded(member.id, expanded)}
              className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
            >
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-base font-semibold">{fullName(member)}</h2>
            </button>
          </div>
          {statusBadges}
        </CardHeader>
        <CardContent className="space-y-2">
          {memberVisits.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No visits assigned today</p>
          ) : (
            memberVisits.map((visit, idx) => {
              const others = visit.assignments.filter((a) => a.staffMember.id !== member.id);
              const gap = visitGaps[idx];
              return (
                <div key={visit.id}>
                  <VisitEntry visit={visit} />
                  {others.length > 0 && (
                    <p className="text-xs text-muted-foreground pl-11 -mt-1 mb-1">
                      Also assigned: {others.map((a) => fullName(a.staffMember)).join(", ")}
                    </p>
                  )}
                  {gap != null && (
                    <div className="flex items-center gap-2 pl-11 py-1 text-xs text-muted-foreground">
                      <span className="flex-1 border-t" />
                      {gap} min available
                      <span className="flex-1 border-t" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          className="pl-10 h-11 text-base"
          placeholder="Search by client or staff name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="sticky top-0 z-10 bg-background flex items-center justify-between gap-3 flex-wrap border-b pb-3">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <Checkbox
            className="h-5 w-5"
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={toggleSelectAll}
            disabled={activeDayVisits.length === 0}
          />
          <span className="text-base text-muted-foreground">
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
          </span>
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <>
              <Button size="lg" onClick={() => setAssignOpen(true)}>
                <UserPlus className="h-5 w-5 mr-2" />
                Assign staff to selected visit(s)
              </Button>
              <Button size="lg" variant="outline" onClick={handleUnassignAll} disabled={bulkUnassignMut.isPending}>
                <UserMinus className="h-5 w-5 mr-2" />
                Remove staff from selected visit(s)
              </Button>
            </>
          )}
          <Button
            size="lg"
            variant="outline"
            onClick={handleAutoAssign}
            disabled={unassignedVisits.length === 0 || autoAssignMut.isPending}
          >
            <Wand2 className="h-5 w-5 mr-2" />
            Auto-assign today
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleAutoAssignWeek}
            disabled={weekUnassignedVisits.length === 0 || autoAssignMut.isPending}
          >
            <Wand2 className="h-5 w-5 mr-2" />
            Auto-assign this week
          </Button>
        </div>
      </div>

      {continuityIssues.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="flex items-center gap-2 font-semibold text-base text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            {continuityIssues.length} client{continuityIssues.length !== 1 ? "s" : ""} seeing more than one carer today
          </p>
          <p className="text-sm text-amber-800 mt-1">
            {continuityIssues.map((i) => fullName(i.serviceUser)).join(", ")}
          </p>
        </div>
      )}

      {skippedResults.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold text-base text-amber-800">
              Auto-assign couldn&apos;t fill {skippedResults.length} visit{skippedResults.length !== 1 ? "s" : ""} — needs manual attention
            </p>
            <Button size="sm" variant="ghost" onClick={() => setSkippedResults([])}>Dismiss</Button>
          </div>
          <div className="mt-1 space-y-1">
            {skippedResults.map((s) => {
              const visit = visits.find((v) => v.id === s.rotaVisitId);
              const dayPrefix = visit && !isSameDay(new Date(visit.visitDate), selectedDay) ? `${formatShort(new Date(visit.visitDate))} ` : "";
              return (
                <p key={s.rotaVisitId} className="text-sm text-amber-800">
                  {visit ? `${dayPrefix}${fullName(visit.serviceUser)} ${visit.startTime}–${visit.endTime}` : "Visit"}: {s.reason}
                </p>
              );
            })}
          </div>
        </div>
      )}

      {activeDayVisits.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-8 text-center">
          <CalendarX2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium text-base">No visits scheduled today</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add visits from a client&apos;s Rota tab to see them here.
          </p>
        </div>
      ) : noMatches ? (
        <p className="text-base text-muted-foreground text-center py-8">No matches for &quot;{query}&quot;</p>
      ) : (
        <div className="space-y-4">
          {visibleUnassigned.length > 0 && (
            <Card className="border-l-4 border-l-amber-400">
              <CardHeader className="flex flex-row items-center justify-between gap-2 py-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Checkbox
                    className="h-5 w-5"
                    checked={visibleUnassigned.every((v) => selectedIds.has(v.id)) ? true : visibleUnassigned.some((v) => selectedIds.has(v.id)) ? "indeterminate" : false}
                    onCheckedChange={() => toggleSelectGroup(visibleUnassigned)}
                  />
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <h2 className="text-base font-semibold">Unassigned visits ({visibleUnassigned.length})</h2>
                </div>
                {!isSearching && (
                  <div className="inline-flex rounded-md border p-0.5">
                    <Button size="sm" variant={groupBy === "time" ? "default" : "ghost"} onClick={() => setGroupBy("time")}>
                      Group by time
                    </Button>
                    <Button size="sm" variant={groupBy === "area" ? "default" : "ghost"} onClick={() => setGroupBy("area")}>
                      <Users2 className="h-4 w-4 mr-1" />
                      Group by area
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {isSearching
                  ? visibleUnassigned.map((visit) => <VisitEntry key={visit.id} visit={visit} />)
                  : groupBy === "time"
                  ? TIME_BANDS.map((band) => {
                      const bandVisits = visibleUnassigned.filter((v) => band.test(v.startTime));
                      if (bandVisits.length === 0) return null;
                      const isCollapsed = collapsedBands.has(band.key);
                      return (
                        <div key={band.key}>
                          <div className="flex items-center gap-2 mb-2">
                            <Checkbox
                              className="h-4 w-4"
                              checked={bandVisits.every((v) => selectedIds.has(v.id)) ? true : bandVisits.some((v) => selectedIds.has(v.id)) ? "indeterminate" : false}
                              onCheckedChange={() => toggleSelectGroup(bandVisits)}
                            />
                            <button
                              type="button"
                              onClick={() => toggleBand(band.key)}
                              className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              {band.label} ({bandVisits.length})
                            </button>
                          </div>
                          {!isCollapsed && (
                            <div className="space-y-2 pl-6">
                              {bandVisits.map((visit) => (
                                <VisitEntry key={visit.id} visit={visit} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  : buildRounds(visibleUnassigned).map((round) => {
                      const bandKey = `${round.area}-${round.roundIndex}`;
                      const isCollapsed = collapsedBands.has(bandKey);
                      return (
                        <div key={bandKey}>
                          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                className="h-4 w-4"
                                checked={round.visits.every((v) => selectedIds.has(v.id)) ? true : round.visits.some((v) => selectedIds.has(v.id)) ? "indeterminate" : false}
                                onCheckedChange={() => toggleSelectGroup(round.visits)}
                              />
                              <button
                                type="button"
                                onClick={() => toggleBand(bandKey)}
                                className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                {round.area} — Round {round.roundIndex + 1} ({round.visits.length} visit{round.visits.length !== 1 ? "s" : ""}, {round.visits[0].startTime}–{round.visits[round.visits.length - 1].endTime})
                              </button>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => selectAndAssignRound(round.visits)}>
                              <UserPlus className="h-3.5 w-3.5 mr-1" />
                              Select &amp; assign this round
                            </Button>
                          </div>
                          {!isCollapsed && (
                            <div className="space-y-2 pl-6">
                              {round.visits.map((visit) => (
                                <VisitEntry key={visit.id} visit={visit} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
              </CardContent>
            </Card>
          )}

          {visibleStaff.map((member) => (
            <StaffCard key={member.id} member={member} />
          ))}

          {cancelledCount > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              {cancelledCount} visit{cancelledCount !== 1 ? "s" : ""} cancelled today
            </p>
          )}
        </div>
      )}

      <AssignVisitsDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        visits={activeDayVisits.filter((v) => selectedIds.has(v.id))}
        staff={staff}
        onAssigned={() => {
          onMutated();
          setSelectedIds(new Set());
        }}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { isSameDay, dayOfWeekName } from "@/lib/date-helpers";
import { type StaffOption, type AvailabilityRow, type LeaveRow, coversDate } from "./staff-matrix";
import { type RotaVisitRow, computeDayTimeRange, packIntoLanes, visitStatusInfo, toMinutes } from "@/lib/rota-scheduling";
import { AssignVisitsDialog } from "./assign-visits-dialog";

const ABSENCE_LABELS: Record<string, string> = {
  SICK: "Sick",
  HOLIDAY: "Holiday",
  UNAUTHORISED: "Unauthorised",
  OTHER: "Leave",
};

const LANE_HEIGHT = 44;
const LANE_GAP = 8;
const LABEL_WIDTH = 224; // px — wide enough for a full name without truncating
const MIN_HOUR_WIDTH = 160; // px — each hour gets at least this much room; the day scrolls horizontally rather than squeezing to fit

interface Props {
  selectedDay: Date;
  visits: RotaVisitRow[];
  staff: StaffOption[];
  availability: AvailabilityRow[];
  leave: LeaveRow[];
  onMutated: () => void;
}

interface DayRange {
  startMinutes: number;
  endMinutes: number;
}

interface Axis {
  range: DayRange;
  hourTicks: number[];
  showNowLine: boolean;
  nowMinutes: number;
  widthPx: number;
}

function pct(minutes: number, range: DayRange): number {
  return ((minutes - range.startMinutes) / (range.endMinutes - range.startMinutes)) * 100;
}

function GridLines({ axis }: { axis: Axis }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {axis.hourTicks.map((m) => (
        <div key={m} className="absolute top-0 bottom-0 border-l border-border/60" style={{ left: `${pct(m, axis.range)}%` }} />
      ))}
      {axis.showNowLine && (
        <div className="absolute top-0 bottom-0 border-l-2 border-red-500 z-10" style={{ left: `${pct(axis.nowMinutes, axis.range)}%` }} />
      )}
    </div>
  );
}

function HourRuler({ axis }: { axis: Axis }) {
  return (
    <div className="relative h-8 flex-1 text-sm font-medium text-muted-foreground">
      {axis.hourTicks.map((m) => (
        <span key={m} className="absolute -translate-x-1/2" style={{ left: `${pct(m, axis.range)}%` }}>
          {String(Math.floor(m / 60)).padStart(2, "0")}:00
        </span>
      ))}
    </div>
  );
}

function VisitBlock({
  visit,
  range,
  onClick,
}: {
  visit: RotaVisitRow;
  range: DayRange;
  onClick: (visit: RotaVisitRow) => void;
}) {
  const status = visitStatusInfo(visit);
  const left = pct(toMinutes(visit.startTime), range);
  const width = Math.max(pct(toMinutes(visit.endTime), range) - left, 2);
  const clickable = visit.status !== "CANCELLED" && visit.assignments.length < visit.carersRequired;
  const label = `${visit.serviceUser.firstName} ${visit.serviceUser.lastName} ${visit.startTime}–${visit.endTime}`;
  const className = cn(
    "absolute h-10 rounded-md border px-2 text-sm leading-10 truncate text-left",
    status.className,
    clickable && "cursor-pointer hover:brightness-95",
  );
  const style = { left: `${left}%`, width: `${width}%` };

  // A visit block's width is proportional to its duration, so a short visit
  // may only have room for a first name — the full name and time are always
  // available via the title tooltip.
  if (!clickable) {
    return (
      <div className={className} style={style} title={label}>
        {visit.serviceUser.firstName}
      </div>
    );
  }
  return (
    <button type="button" onClick={() => onClick(visit)} className={className} style={style} title={label}>
      {visit.serviceUser.firstName}
    </button>
  );
}

function VisitLanes({
  lanes,
  range,
  onVisitClick,
}: {
  lanes: RotaVisitRow[][];
  range: DayRange;
  onVisitClick: (visit: RotaVisitRow) => void;
}) {
  return (
    <>
      {lanes.map((lane, laneIdx) => (
        <div key={laneIdx} className="absolute inset-x-0" style={{ top: laneIdx * (LANE_HEIGHT + LANE_GAP), height: LANE_HEIGHT }}>
          {lane.map((visit) => (
            <VisitBlock key={visit.id} visit={visit} range={range} onClick={onVisitClick} />
          ))}
        </div>
      ))}
    </>
  );
}

function ClientRow({
  client,
  visits,
  axis,
  onVisitClick,
}: {
  client: RotaVisitRow["serviceUser"];
  visits: RotaVisitRow[];
  axis: Axis;
  onVisitClick: (visit: RotaVisitRow) => void;
}) {
  const lanes = packIntoLanes(visits);
  const rowHeight = Math.max(lanes.length, 1) * (LANE_HEIGHT + LANE_GAP);

  return (
    <div className="flex border-b">
      <div
        className="shrink-0 px-3 py-3 text-base font-medium leading-snug sticky left-0 z-10 bg-background"
        style={{ width: LABEL_WIDTH }}
      >
        {client.firstName} {client.lastName}
      </div>
      <div className="relative flex-1" style={{ height: rowHeight }}>
        <GridLines axis={axis} />
        <VisitLanes lanes={lanes} range={axis.range} onVisitClick={onVisitClick} />
      </div>
    </div>
  );
}

function StaffRow({
  member,
  visits,
  availability,
  onLeave,
  leaveLabel,
  axis,
  onVisitClick,
}: {
  member: StaffOption;
  visits: RotaVisitRow[];
  availability: AvailabilityRow[];
  onLeave: boolean;
  leaveLabel: string | null;
  axis: Axis;
  onVisitClick: (visit: RotaVisitRow) => void;
}) {
  const lanes = packIntoLanes(visits);
  const rowHeight = Math.max(lanes.length, 1) * (LANE_HEIGHT + LANE_GAP);

  return (
    <div className="flex border-b">
      <div
        className="shrink-0 px-3 py-3 text-base font-medium leading-snug sticky left-0 z-10 bg-background"
        style={{ width: LABEL_WIDTH }}
      >
        {member.firstName} {member.lastName}
        {onLeave && leaveLabel && <span className="block text-xs font-normal text-red-700">{leaveLabel}</span>}
      </div>
      <div className="relative flex-1" style={{ height: rowHeight }}>
        <GridLines axis={axis} />
        {onLeave ? (
          <div className="absolute inset-0 bg-red-100/50" />
        ) : (
          availability.map((a, idx) => {
            const from = Math.max(toMinutes(a.availableFrom), axis.range.startMinutes);
            const to = Math.min(toMinutes(a.availableTo), axis.range.endMinutes);
            if (to <= from) return null;
            return (
              <div
                key={idx}
                className={cn("absolute top-0 bottom-0", a.isAvailable ? "bg-green-50" : "bg-muted/60")}
                style={{ left: `${pct(from, axis.range)}%`, width: `${pct(to, axis.range) - pct(from, axis.range)}%` }}
              />
            );
          })
        )}
        <VisitLanes lanes={lanes} range={axis.range} onVisitClick={onVisitClick} />
      </div>
    </div>
  );
}

/**
 * A proportional, click-to-assign (never drag-and-drop, per the accessibility
 * decision for this app's non-technical users) time-axis view: clients on
 * top, staff below, sharing one hourly gridline set so gaps, overlaps, and
 * double-bookings are visible at a glance. Read-only except for clicking an
 * unassigned/partially-assigned block, which opens the same shared assign
 * dialog used elsewhere.
 */
export function RotaTimeline({ selectedDay, visits, staff, availability, leave, onMutated }: Props) {
  const [clickedVisit, setClickedVisit] = useState<RotaVisitRow | null>(null);

  const dayVisits = visits.filter((v) => isSameDay(new Date(v.visitDate), selectedDay));
  const activeDayVisits = dayVisits.filter((v) => v.status !== "CANCELLED");
  const range = computeDayTimeRange(dayVisits);

  const hourTicks: number[] = [];
  for (let m = range.startMinutes; m <= range.endMinutes; m += 60) hourTicks.push(m);

  const isToday = isSameDay(selectedDay, new Date());
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNowLine = isToday && nowMinutes >= range.startMinutes && nowMinutes <= range.endMinutes;

  const widthPx = ((range.endMinutes - range.startMinutes) / 60) * MIN_HOUR_WIDTH;
  const axis: Axis = { range, hourTicks, showNowLine, nowMinutes, widthPx };

  const dayOfWeek = dayOfWeekName(selectedDay);

  const clients = [...new Map(activeDayVisits.map((v) => [v.serviceUser.id, v.serviceUser])).values()].sort((a, b) =>
    `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
  );

  const visibleStaff = staff.filter((member) => {
    const hasVisit = activeDayVisits.some((v) => v.assignments.some((a) => a.staffMember.id === member.id));
    const hasAvailability = availability.some(
      (a) => a.staffMemberId === member.id && a.dayOfWeek === dayOfWeek && coversDate(a.effectiveFrom, a.effectiveTo, selectedDay),
    );
    const hasLeave = leave.some(
      (l) => l.staffMemberId === member.id && new Date(l.startDate) <= selectedDay && (!l.endDate || new Date(l.endDate) >= selectedDay),
    );
    return hasVisit || hasAvailability || hasLeave;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold mb-2">Clients</h2>
        <div className="rounded-lg border overflow-x-auto">
          <div style={{ width: LABEL_WIDTH + axis.widthPx }}>
            <div className="flex border-b bg-muted/40">
              <div className="shrink-0 sticky left-0 z-10 bg-muted/40" style={{ width: LABEL_WIDTH }} />
              <HourRuler axis={axis} />
            </div>
            {clients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No client visits scheduled today.</p>
            ) : (
              clients.map((client) => (
                <ClientRow
                  key={client.id}
                  client={client}
                  visits={activeDayVisits.filter((v) => v.serviceUser.id === client.id)}
                  axis={axis}
                  onVisitClick={setClickedVisit}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold mb-2">Staff</h2>
        <div className="rounded-lg border overflow-x-auto">
          <div style={{ width: LABEL_WIDTH + axis.widthPx }}>
            <div className="flex border-b bg-muted/40">
              <div className="shrink-0 sticky left-0 z-10 bg-muted/40" style={{ width: LABEL_WIDTH }} />
              <HourRuler axis={axis} />
            </div>
            {visibleStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No staff activity today.</p>
            ) : (
              visibleStaff.map((member) => {
                const memberLeave = leave.filter(
                  (l) => l.staffMemberId === member.id && new Date(l.startDate) <= selectedDay && (!l.endDate || new Date(l.endDate) >= selectedDay),
                );
                const onLeave = memberLeave.length > 0;
                const leaveLabel = onLeave ? (ABSENCE_LABELS[memberLeave[0].absenceType] ?? memberLeave[0].absenceType) : null;
                const memberAvailability = availability.filter(
                  (a) => a.staffMemberId === member.id && a.dayOfWeek === dayOfWeek && coversDate(a.effectiveFrom, a.effectiveTo, selectedDay),
                );
                return (
                  <StaffRow
                    key={member.id}
                    member={member}
                    visits={activeDayVisits.filter((v) => v.assignments.some((a) => a.staffMember.id === member.id))}
                    availability={memberAvailability}
                    onLeave={onLeave}
                    leaveLabel={leaveLabel}
                    axis={axis}
                    onVisitClick={setClickedVisit}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      <AssignVisitsDialog
        open={clickedVisit !== null}
        onOpenChange={(open) => !open && setClickedVisit(null)}
        visits={clickedVisit ? [clickedVisit] : []}
        staff={staff}
        onAssigned={() => {
          onMutated();
          setClickedVisit(null);
        }}
      />
    </div>
  );
}

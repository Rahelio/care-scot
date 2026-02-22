"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Info } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatShort(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800 border-blue-200",
  CONFIRMED: "bg-green-100 text-green-800 border-green-200",
  IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200",
  COMPLETED: "bg-muted text-muted-foreground border-border",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
};

export default function RotaPage() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const today = useMemo(() => new Date(), []);

  const { data: shifts, isPending } = trpc.rota.getShifts.useQuery({
    from: weekStart,
    to: weekEnd,
  });

  function prevWeek() {
    setWeekStart((w) => addDays(w, -7));
  }
  function nextWeek() {
    setWeekStart((w) => addDays(w, 7));
  }
  function thisWeek() {
    setWeekStart(getMonday(new Date()));
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Rota</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Read-only view — populated by external rota system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevWeek} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={thisWeek}>
            This Week
          </Button>
          <Button variant="outline" size="icon" onClick={nextWeek} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week label */}
      <p className="text-sm text-muted-foreground font-medium">
        Week of {formatShort(weekStart)} — {formatShort(weekEnd)}
      </p>

      {/* Calendar grid */}
      {isPending ? (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : !shifts || shifts.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-8 text-center">
          <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium text-sm">No shifts scheduled this week</p>
          <p className="text-xs text-muted-foreground mt-1">
            Rota data is managed by your external scheduling system and synced here
            automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {weekDays.map((day, i) => {
            const dayShifts = shifts.filter((s) =>
              isSameDay(new Date(s.shiftDate), day),
            );
            const isToday = isSameDay(day, today);

            return (
              <div
                key={i}
                className={cn(
                  "rounded-lg border min-h-[10rem] p-2 flex flex-col",
                  isToday && "ring-2 ring-primary/30",
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {DAY_LABELS[i]}
                  </span>
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
                  {dayShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className={cn(
                        "rounded border px-2 py-1.5 text-xs",
                        STATUS_COLORS[shift.status] ?? "bg-muted",
                      )}
                    >
                      <p className="font-medium truncate">
                        {shift.staffMember
                          ? `${shift.staffMember.firstName} ${shift.staffMember.lastName}`
                          : "Unassigned"}
                      </p>
                      <p className="text-[10px] opacity-75">
                        {shift.startTime}–{shift.endTime}
                      </p>
                      {shift.serviceUser && (
                        <p className="text-[10px] opacity-75 truncate">
                          {shift.serviceUser.firstName} {shift.serviceUser.lastName}
                        </p>
                      )}
                    </div>
                  ))}
                  {dayShifts.length === 0 && (
                    <p className="text-[10px] text-muted-foreground/50 text-center pt-4">
                      No shifts
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-md border px-4 py-3 bg-muted/30">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p>
            This is a <strong>read-only</strong> view. Rota data is managed by your
            external scheduling system and synced here automatically.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(STATUS_COLORS).map(([status, cls]) => (
              <Badge key={status} variant="outline" className={cn("text-[10px]", cls)}>
                {status.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMonday, addDays, formatLong, startOfDay, toDateOnly } from "@/lib/date-helpers";
import { DayVisitAssignmentList } from "@/components/modules/rota/day-visit-assignment-list";
import { StaffMatrix } from "@/components/modules/rota/staff-matrix";
import { ClientsView } from "@/components/modules/rota/clients-view";
import { CapacitySummary } from "@/components/modules/rota/capacity-summary";
import { RotaTimeline } from "@/components/modules/rota/rota-timeline";

type View = "visits" | "staff" | "clients" | "capacity" | "timeline";

export default function RotaPage() {
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const [view, setView] = useState<View>("visits");

  const weekStart = useMemo(() => getMonday(selectedDay), [selectedDay]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const utils = trpc.useUtils();
  const { data, isPending } = trpc.rota.grid.getGridData.useQuery({
    from: toDateOnly(weekStart),
    to: toDateOnly(weekEnd),
  });
  const { data: staffData } = trpc.staff.list.useQuery({ status: "ACTIVE", limit: 100 });

  const staff = staffData?.items ?? [];

  function prevDay() {
    setSelectedDay((d) => addDays(d, -1));
  }
  function nextDay() {
    setSelectedDay((d) => addDays(d, 1));
  }
  function goToday() {
    setSelectedDay(startOfDay(new Date()));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Rota</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Assign staff to planned care visits based on availability and leave.
          </p>
        </div>
        <div className="inline-flex rounded-md border p-0.5">
          <Button size="sm" variant={view === "visits" ? "default" : "ghost"} onClick={() => setView("visits")}>
            Visits
          </Button>
          <Button size="sm" variant={view === "staff" ? "default" : "ghost"} onClick={() => setView("staff")}>
            Staff
          </Button>
          <Button size="sm" variant={view === "clients" ? "default" : "ghost"} onClick={() => setView("clients")}>
            Clients
          </Button>
          <Button size="sm" variant={view === "capacity" ? "default" : "ghost"} onClick={() => setView("capacity")}>
            Capacity
          </Button>
          <Button size="sm" variant={view === "timeline" ? "default" : "ghost"} onClick={() => setView("timeline")}>
            Timeline
          </Button>
        </div>
      </div>

      {(view === "visits" || view === "clients" || view === "timeline") && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="lg" onClick={prevDay} aria-label="Previous day">
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button variant="outline" size="lg" onClick={nextDay} aria-label="Next day">
              <ChevronRight className="h-6 w-6" />
            </Button>
            <Button variant="outline" size="lg" onClick={goToday}>
              Today
            </Button>
          </div>
          <p className="text-lg font-semibold">{formatLong(selectedDay)}</p>
          <Input
            type="date"
            className="w-fit"
            value={selectedDay.toISOString().split("T")[0]}
            onChange={(e) => e.target.value && setSelectedDay(startOfDay(new Date(e.target.value)))}
          />
        </div>
      )}

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : view === "visits" ? (
        <DayVisitAssignmentList
          selectedDay={selectedDay}
          visits={data?.visits ?? []}
          staff={staff}
          availability={data?.availability ?? []}
          leave={data?.leave ?? []}
          onMutated={() => utils.rota.grid.invalidate()}
        />
      ) : view === "staff" ? (
        <StaffMatrix
          weekDays={weekDays}
          staff={staff}
          availability={data?.availability ?? []}
          leave={data?.leave ?? []}
        />
      ) : view === "clients" ? (
        <ClientsView selectedDay={selectedDay} weekDays={weekDays} visits={data?.visits ?? []} />
      ) : view === "capacity" ? (
        <CapacitySummary visits={data?.visits ?? []} staff={staff} />
      ) : (
        <RotaTimeline
          selectedDay={selectedDay}
          visits={data?.visits ?? []}
          staff={staff}
          availability={data?.availability ?? []}
          leave={data?.leave ?? []}
          onMutated={() => utils.rota.grid.invalidate()}
        />
      )}
    </div>
  );
}

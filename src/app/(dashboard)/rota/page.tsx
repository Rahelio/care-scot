"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { getMonday, addDays, formatShort } from "@/lib/date-helpers";
import { VisitsGrid } from "@/components/modules/rota/visits-grid";
import { StaffMatrix } from "@/components/modules/rota/staff-matrix";

type View = "visits" | "staff";

export default function RotaPage() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [view, setView] = useState<View>("visits");

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const utils = trpc.useUtils();
  const { data, isPending } = trpc.rota.grid.getGridData.useQuery({ from: weekStart, to: weekEnd });
  const { data: staffData } = trpc.staff.list.useQuery({ status: "ACTIVE", limit: 100 });

  const staff = staffData?.items ?? [];

  function prevWeek() {
    setWeekStart((w) => addDays(w, -7));
  }
  function nextWeek() {
    setWeekStart((w) => addDays(w, 7));
  }
  function thisWeek() {
    setWeekStart(getMonday(new Date()));
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

      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground font-medium">
          Week of {formatShort(weekStart)} — {formatShort(weekEnd)}
        </p>
        <div className="inline-flex rounded-md border p-0.5">
          <Button
            size="sm"
            variant={view === "visits" ? "default" : "ghost"}
            onClick={() => setView("visits")}
          >
            Visits
          </Button>
          <Button
            size="sm"
            variant={view === "staff" ? "default" : "ghost"}
            onClick={() => setView("staff")}
          >
            Staff
          </Button>
        </div>
      </div>

      {isPending ? (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : view === "visits" ? (
        <VisitsGrid
          weekDays={weekDays}
          visits={data?.visits ?? []}
          staff={staff}
          onMutated={() => utils.rota.grid.invalidate()}
        />
      ) : (
        <StaffMatrix
          weekDays={weekDays}
          staff={staff}
          availability={data?.availability ?? []}
          leave={data?.leave ?? []}
        />
      )}
    </div>
  );
}

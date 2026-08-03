"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDays, formatLong, startOfDay, toDateOnly } from "@/lib/date-helpers";
import { MyScheduleList } from "@/components/modules/rota/my-schedule-list";

export default function MySchedulePage() {
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));

  const { data, isPending } = trpc.rota.mine.getForRange.useQuery({
    from: toDateOnly(selectedDay),
    to: toDateOnly(selectedDay),
  });

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
      <div>
        <h1 className="text-2xl font-semibold">My Schedule</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your care visits — for the full team rota, ask a manager or coordinator.
        </p>
      </div>

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

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <MyScheduleList selectedDay={selectedDay} visits={data?.visits ?? []} />
      )}
    </div>
  );
}

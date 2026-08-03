"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClientMatrix } from "./client-matrix";
import { ClientVisitList } from "./client-visit-list";
import type { RotaVisitRow } from "@/lib/rota-scheduling";

type SubView = "week" | "day";

interface Props {
  selectedDay: Date;
  weekDays: Date[];
  visits: RotaVisitRow[];
}

export function ClientsView({ selectedDay, weekDays, visits }: Props) {
  const [subView, setSubView] = useState<SubView>("week");

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-md border p-0.5">
        <Button size="sm" variant={subView === "week" ? "default" : "ghost"} onClick={() => setSubView("week")}>
          Week Grid
        </Button>
        <Button size="sm" variant={subView === "day" ? "default" : "ghost"} onClick={() => setSubView("day")}>
          Day List
        </Button>
      </div>

      {subView === "week" ? (
        <ClientMatrix weekDays={weekDays} visits={visits} />
      ) : (
        <ClientVisitList selectedDay={selectedDay} visits={visits} />
      )}
    </div>
  );
}

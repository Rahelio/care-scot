"use client";

import { useState } from "react";
import { Search, ChevronDown, ChevronRight, Clock, CalendarX2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isSameDay } from "@/lib/date-helpers";
import { needsAttention, type RotaVisitRow } from "@/lib/rota-scheduling";

interface Props {
  selectedDay: Date;
  visits: RotaVisitRow[];
}

function fullName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`;
}

function visitStatusInfo(visit: RotaVisitRow): { label: string; className: string } {
  if (visit.status === "CANCELLED") {
    return { label: "Cancelled", className: "bg-muted text-muted-foreground border-border" };
  }
  const assigned = visit.assignments.length;
  if (assigned === 0) {
    return { label: "Unassigned", className: "bg-orange-100 text-orange-800 border-orange-300" };
  }
  if (assigned < visit.carersRequired) {
    return {
      label: `${assigned} of ${visit.carersRequired} carers assigned`,
      className: "bg-blue-100 text-blue-800 border-blue-300",
    };
  }
  return { label: "Fully assigned", className: "bg-green-100 text-green-800 border-green-300" };
}

export function ClientVisitList({ selectedDay, visits }: Props) {
  const [query, setQuery] = useState("");
  const [expandOverrides, setExpandOverrides] = useState<Map<string, boolean>>(new Map());
  const [dayForOverrides, setDayForOverrides] = useState(selectedDay);

  if (selectedDay !== dayForOverrides) {
    setDayForOverrides(selectedDay);
    setExpandOverrides(new Map());
  }

  const dayVisits = visits.filter((v) => v.status !== "CANCELLED" && isSameDay(new Date(v.visitDate), selectedDay));

  const byClient = new Map<string, { client: RotaVisitRow["serviceUser"]; visits: RotaVisitRow[] }>();
  for (const visit of dayVisits) {
    const entry = byClient.get(visit.serviceUser.id) ?? { client: visit.serviceUser, visits: [] };
    entry.visits.push(visit);
    byClient.set(visit.serviceUser.id, entry);
  }
  const clients = [...byClient.values()].sort((a, b) =>
    `${a.client.lastName} ${a.client.firstName}`.localeCompare(`${b.client.lastName} ${b.client.firstName}`),
  );

  const q = query.trim().toLowerCase();
  const isSearching = q.length > 0;
  const visibleClients = clients.filter((c) => !isSearching || fullName(c.client).toLowerCase().includes(q));

  function toggleExpanded(clientId: string, currentlyExpanded: boolean) {
    setExpandOverrides((prev) => new Map(prev).set(clientId, !currentlyExpanded));
  }

  if (dayVisits.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 p-8 text-center">
        <CalendarX2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="font-medium text-base">No client visits scheduled today</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          className="pl-10 h-11 text-base"
          placeholder="Search by client name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isSearching && visibleClients.length === 0 ? (
        <p className="text-base text-muted-foreground text-center py-8">No matches for &quot;{query}&quot;</p>
      ) : (
        <div className="space-y-3">
          {visibleClients.map(({ client, visits: clientVisits }) => {
            const sorted = [...clientVisits].sort((a, b) => a.startTime.localeCompare(b.startTime));
            const override = expandOverrides.get(client.id);
            const expanded = isSearching ? true : override !== undefined ? override : needsAttention(sorted);

            if (!expanded) {
              return (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => toggleExpanded(client.id, expanded)}
                  className="w-full flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="text-base font-semibold truncate">{fullName(client)}</span>
                    <span className="text-sm text-muted-foreground shrink-0">
                      {sorted.length} visit{sorted.length !== 1 ? "s" : ""} today
                    </span>
                  </div>
                </button>
              );
            }

            return (
              <Card key={client.id}>
                <CardHeader className="py-3">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(client.id, expanded)}
                    className="flex items-center gap-1.5 hover:opacity-70 transition-opacity w-fit"
                  >
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-base font-semibold">{fullName(client)}</h2>
                  </button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sorted.map((visit) => {
                    const status = visitStatusInfo(visit);
                    return (
                      <div key={visit.id} className="rounded-md border px-4 py-3 space-y-1">
                        <p className="flex items-center gap-1.5 text-base tabular-nums text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {visit.startTime}–{visit.endTime}
                        </p>
                        {visit.assignments.length > 0 && (
                          <p className="text-sm">
                            {visit.assignments.map((a) => fullName(a.staffMember)).join(", ")}
                          </p>
                        )}
                        <Badge variant="outline" className={cn("text-xs", status.className)}>
                          {status.label}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

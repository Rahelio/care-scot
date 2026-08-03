"use client";

import { Badge } from "@/components/ui/badge";
import { isSameDay } from "@/lib/date-helpers";
import type { RotaVisitRow } from "@/lib/rota-scheduling";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  weekDays: Date[];
  visits: RotaVisitRow[];
}

export function ClientMatrix({ weekDays, visits }: Props) {
  const activeVisits = visits.filter((v) => v.status !== "CANCELLED");
  const clients = [...new Map(activeVisits.map((v) => [v.serviceUser.id, v.serviceUser])).values()].sort((a, b) =>
    `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
  );

  if (clients.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">No client visits scheduled this week.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-muted/40">
            <th className="text-left font-medium px-3 py-2 sticky left-0 bg-muted/40">Client</th>
            {weekDays.map((day, i) => (
              <th key={i} className="text-left font-medium px-3 py-2 min-w-[160px]">
                {DAY_LABELS[i]} {day.getDate()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-t">
              <td className="px-3 py-2 font-medium whitespace-nowrap sticky left-0 bg-background">
                {client.firstName} {client.lastName}
              </td>
              {weekDays.map((day, i) => {
                const dayVisits = activeVisits
                  .filter((v) => v.serviceUser.id === client.id && isSameDay(new Date(v.visitDate), day))
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));

                return (
                  <td key={i} className="px-3 py-2 align-top">
                    <div className="flex flex-col gap-1">
                      {dayVisits.length === 0 && <span className="text-xs text-muted-foreground/50">—</span>}
                      {dayVisits.map((visit) => (
                        <div key={visit.id} className="text-xs">
                          <span className="tabular-nums">{visit.startTime}–{visit.endTime}</span>{" "}
                          {visit.assignments.length === 0 ? (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]">
                              Unassigned
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">
                              {visit.assignments.map((a) => `${a.staffMember.firstName} ${a.staffMember.lastName}`).join(", ")}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

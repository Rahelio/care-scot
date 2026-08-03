"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ClipboardList, Clock, MapPin, CalendarX2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { startOfDay, toDateOnly } from "@/lib/date-helpers";

interface Visit {
  id: string;
  visitDate: Date;
  startTime: string;
  endTime: string;
  carersRequired: number;
  status: string;
  notes: string | null;
  serviceUser: { id: string; firstName: string; lastName: string; area?: string | null };
  assignments: { staffMember: { id: string; firstName: string; lastName: string } }[];
}

interface Props {
  selectedDay: Date;
  visits: Visit[];
}

export function MyScheduleList({ selectedDay, visits }: Props) {
  const { data: session } = useSession();
  const myStaffMemberId = (session?.user as { staffMemberId?: string } | undefined)?.staffMemberId;

  const today = startOfDay(new Date());
  const canRecord = toDateOnly(selectedDay).getTime() <= toDateOnly(today).getTime();

  const sorted = [...visits].sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 p-8 text-center">
        <CalendarX2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="font-medium text-base">No visits scheduled for you today</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((visit) => {
        const others = visit.assignments.filter((a) => a.staffMember.id !== myStaffMemberId);
        const clientName = `${visit.serviceUser.firstName} ${visit.serviceUser.lastName}`;
        const params = new URLSearchParams({
          rotaVisitId: visit.id,
          visitDate: toDateOnly(new Date(visit.visitDate)).toISOString().split("T")[0],
          startTime: visit.startTime,
          endTime: visit.endTime,
        });

        return (
          <Card key={visit.id}>
            <CardContent className="py-4 flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1.5 min-w-0">
                <p className="text-lg font-semibold break-words">{clientName}</p>
                <p className="flex items-center gap-1.5 text-base tabular-nums text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {visit.startTime}–{visit.endTime}
                </p>
                {visit.serviceUser.area && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {visit.serviceUser.area}
                  </p>
                )}
                {visit.carersRequired > 1 && others.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Also with: {others.map((a) => `${a.staffMember.firstName} ${a.staffMember.lastName}`).join(", ")}
                  </p>
                )}
                {visit.notes && <p className="text-sm text-muted-foreground italic">{visit.notes}</p>}
                <Badge variant="outline" className="text-xs">
                  {visit.status.replace(/_/g, " ")}
                </Badge>
              </div>
              {canRecord && (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/clients/${visit.serviceUser.id}/care-records/new?${params.toString()}`}>
                    <ClipboardList className="h-4 w-4 mr-1.5" />
                    Record this visit
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

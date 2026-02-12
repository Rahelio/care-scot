"use client";

import Link from "next/link";
import { Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

const MODULE_LOAD_TIME = Date.now();

interface CareVisitListProps {
  serviceUserId: string;
}

export function CareVisitList({ serviceUserId }: CareVisitListProps) {
  const { data, isPending } = trpc.clients.listCareVisits.useQuery({
    serviceUserId,
    limit: 10,
  });

  if (isPending) {
    return <div className="py-8 text-center text-muted-foreground">Loading…</div>;
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Care Records</h2>
        <Button asChild>
          <Link href={`/clients/${serviceUserId}/care-records/new`}>
            <Plus className="h-4 w-4 mr-2" />
            Log Visit
          </Link>
        </Button>
      </div>

      {!items.length ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-4">No care visit records yet.</p>
            <Button asChild variant="outline">
              <Link href={`/clients/${serviceUserId}/care-records/new`}>
                Log First Visit
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((visit) => {
            const tasks = (visit.tasksCompleted as { task: string; completed: boolean; notes?: string }[] | null) ?? [];
            const completedTasks = tasks.filter((t) => t.completed).length;
            const totalTasks = tasks.length;
            const isLocked =
              (MODULE_LOAD_TIME - new Date(visit.createdAt).getTime()) / (1000 * 60 * 60) > 48;

            return (
              <Card key={visit.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{formatDate(visit.visitDate)}</p>
                        {visit.staffMember && (
                          <span className="text-sm text-muted-foreground">
                            — {visit.staffMember.firstName} {visit.staffMember.lastName}
                          </span>
                        )}
                        {isLocked && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                        {visit.refusedCare && (
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                            <XCircle className="h-3 w-3 mr-1" />
                            Care Refused
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(visit.scheduledStart).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" – "}
                        {new Date(visit.scheduledEnd).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" (scheduled)"}
                      </p>
                    </div>

                    {totalTasks > 0 && (
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium">{completedTasks}/{totalTasks}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">tasks done</p>
                      </div>
                    )}
                  </div>

                  {visit.wellbeingObservations && (
                    <p className="mt-3 text-sm text-muted-foreground border-t pt-3 line-clamp-2">
                      {visit.wellbeingObservations}
                    </p>
                  )}

                  {visit.conditionChanges && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium text-orange-700">Condition change: </span>
                      <span className="text-muted-foreground line-clamp-1">{visit.conditionChanges}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {data && data.total > 10 && (
        <p className="text-sm text-center text-muted-foreground">
          Showing 10 of {data.total} records
        </p>
      )}
    </div>
  );
}

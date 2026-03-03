"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, CheckCircle, XCircle, Pencil, Lock, Clock } from "lucide-react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDuration } from "@/lib/utils";

const MANAGER_ROLES = ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"];
const PAGE_SIZE = 10;
const MODULE_NOW = Date.now();

interface CareVisitListProps {
  serviceUserId: string;
}

export function CareVisitList({ serviceUserId }: CareVisitListProps) {
  const [page, setPage] = useState(1);
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const isManager = MANAGER_ROLES.includes(role);

  const { data, isPending } = trpc.clients.listCareVisits.useQuery({
    serviceUserId,
    page,
    limit: PAGE_SIZE,
  });

  if (isPending) {
    return <div className="py-8 text-center text-muted-foreground">Loading…</div>;
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  function isVisitLocked(createdAt: Date) {
    return (MODULE_NOW - createdAt.getTime()) / (1000 * 60 * 60) > 48;
  }

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
            const tasks =
              (visit.tasksCompleted as {
                task: string;
                completed: boolean;
                notes?: string;
              }[] | null) ?? [];
            const completedCount = tasks.filter((t) => t.completed).length;
            const totalCount = tasks.length;
            const locked = isVisitLocked(visit.createdAt);
            const canEdit = !locked || isManager;

            return (
              <Card key={visit.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{formatDate(visit.visitDate)}</p>
                        {visit.staffMember && (
                          <span className="text-sm text-muted-foreground">
                            — {visit.staffMember.firstName} {visit.staffMember.lastName}
                          </span>
                        )}
                        {locked && (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                        {visit.refusedCare && (
                          <Badge
                            variant="outline"
                            className="bg-orange-100 text-orange-800 border-orange-200 text-xs"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Care Refused
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1 flex-wrap">
                          {new Date(visit.scheduledStart).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {" – "}
                          {new Date(visit.scheduledEnd).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          <span className="text-xs">(scheduled)</span>
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground/70 ml-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(new Date(visit.scheduledStart), new Date(visit.scheduledEnd))}
                          </span>
                        </span>
                        {visit.actualStart && visit.actualEnd && (
                          <span className="flex items-center gap-1 flex-wrap">
                            {new Date(visit.actualStart).toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {" – "}
                            {new Date(visit.actualEnd).toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            <span className="text-xs">(actual)</span>
                            <span className="flex items-center gap-0.5 text-xs text-muted-foreground/70 ml-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(new Date(visit.actualStart), new Date(visit.actualEnd))}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {totalCount > 0 && (
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="font-medium">
                              {completedCount}/{totalCount}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">tasks</p>
                        </div>
                      )}
                      {canEdit && (
                        <Button asChild variant="ghost" size="sm">
                          <Link
                            href={`/clients/${serviceUserId}/care-records/${visit.id}/edit`}
                          >
                            {locked ? (
                              <>
                                <Lock className="h-3.5 w-3.5 mr-1" />
                                Unlock &amp; Edit
                              </>
                            ) : (
                              <>
                                <Pencil className="h-3.5 w-3.5 mr-1" />
                                Edit
                              </>
                            )}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>

                  {visit.wellbeingObservations && (
                    <p className="mt-3 text-sm text-muted-foreground border-t pt-3 line-clamp-2">
                      {visit.wellbeingObservations}
                    </p>
                  )}

                  {visit.conditionChanges && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium text-orange-700">Condition change: </span>
                      <span className="text-muted-foreground line-clamp-1">
                        {visit.conditionChanges}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 pt-2">
          {page > 1 && (
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          {page * PAGE_SIZE < total && (
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

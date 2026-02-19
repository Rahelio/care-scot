"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft, Shield, Calendar, User, Clock } from "lucide-react";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";
import { SafeguardingTracker } from "@/components/modules/incidents/safeguarding-tracker";
import {
  SAFEGUARDING_TYPE_LABELS,
  SAFEGUARDING_STATUS_CONFIG,
} from "@/components/modules/incidents/incident-meta";

function LV({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{value || "—"}</p>
    </div>
  );
}

export default function SafeguardingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? "";
  const canManage = ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"].includes(userRole);

  const { data: concern, isPending } =
    trpc.incidents.safeguarding.getById.useQuery({ id }, { enabled: !!id });

  if (isPending) {
    return <div className="py-12 text-center text-muted-foreground">Loading…</div>;
  }

  if (!concern) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Safeguarding concern not found.
      </div>
    );
  }

  const statusConfig = SAFEGUARDING_STATUS_CONFIG[concern.status];

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/incidents?tab=safeguarding">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Safeguarding
        </Link>
      </Button>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Shield className="h-5 w-5 text-amber-600" />
          <h1 className="text-2xl font-semibold">
            {SAFEGUARDING_TYPE_LABELS[concern.concernType] ??
              concern.concernType}
          </h1>
          <Badge variant="outline" className={`${statusConfig?.badgeClass}`}>
            {statusConfig?.label ?? concern.status}
          </Badge>
          {concern.adultProtectionInvestigation && (
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-800 border-blue-200"
            >
              ASP Investigation
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(concern.concernDate)}
          </span>
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {concern.serviceUser.firstName} {concern.serviceUser.lastName}
          </span>
          {concern.raisedByUser && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Raised by {concern.raisedByUser.email}
            </span>
          )}
        </div>
      </div>

      {/* Concern details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Concern Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LV label="Description" value={concern.description} />
          {concern.referredTo && (
            <LV label="Referred To" value={concern.referredTo} />
          )}
        </CardContent>
      </Card>

      {/* Tracker / Investigation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {canManage ? "Tracker & Investigation" : "Investigation Status"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <SafeguardingTracker
              concernId={id}
              defaultValues={{
                referredTo: concern.referredTo,
                referralDate: concern.referralDate,
                referralReference: concern.referralReference,
                adultProtectionInvestigation:
                  concern.adultProtectionInvestigation,
                investigationOutcome: concern.investigationOutcome,
                actionsTaken: concern.actionsTaken,
                status: concern.status,
              }}
            />
          ) : (
            <div className="space-y-4">
              {concern.referredTo ? (
                <>
                  <LV label="Referred To" value={concern.referredTo} />
                  {concern.referralDate && (
                    <LV
                      label="Referral Date"
                      value={formatDate(concern.referralDate)}
                    />
                  )}
                  {concern.referralReference && (
                    <LV
                      label="Reference"
                      value={concern.referralReference}
                    />
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Awaiting management review.
                </p>
              )}
              {concern.actionsTaken && (
                <LV label="Actions Taken" value={concern.actionsTaken} />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

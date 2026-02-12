"use client";

import { use } from "react";
import Link from "next/link";
import { Plus, CheckCircle, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatCurrency } from "@/lib/utils";

export default function AgreementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: agreements, isPending } = trpc.clients.listServiceAgreements.useQuery({
    serviceUserId: id,
  });

  if (isPending) {
    return <div className="py-8 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Service Agreement</h2>
        <Button asChild>
          <Link href={`/clients/${id}/agreement/new`}>
            <Plus className="h-4 w-4 mr-2" />
            New Agreement
          </Link>
        </Button>
      </div>

      {!agreements?.length ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-4">No service agreement recorded yet.</p>
            <Button asChild variant="outline">
              <Link href={`/clients/${id}/agreement/new`}>
                Create Agreement
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {agreements.map((agreement) => (
            <Card key={agreement.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  Agreement from {formatDate(agreement.startDate)}
                  {agreement.endDate && ` to ${formatDate(agreement.endDate)}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {agreement.servicesDescription && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Services</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {agreement.servicesDescription}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
                  {agreement.visitFrequency && (
                    <div>
                      <p className="text-muted-foreground">Frequency</p>
                      <p className="font-medium">{agreement.visitFrequency}</p>
                    </div>
                  )}
                  {agreement.visitDurationMinutes != null && (
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p className="font-medium">{agreement.visitDurationMinutes} min</p>
                    </div>
                  )}
                  {agreement.costPerVisit != null && (
                    <div>
                      <p className="text-muted-foreground">Per Visit</p>
                      <p className="font-medium">{formatCurrency(Number(agreement.costPerVisit))}</p>
                    </div>
                  )}
                  {agreement.costPerHour != null && (
                    <div>
                      <p className="text-muted-foreground">Per Hour</p>
                      <p className="font-medium">{formatCurrency(Number(agreement.costPerHour))}</p>
                    </div>
                  )}
                  {agreement.weeklyCost != null && (
                    <div>
                      <p className="text-muted-foreground">Weekly</p>
                      <p className="font-medium">{formatCurrency(Number(agreement.weeklyCost))}</p>
                    </div>
                  )}
                  {agreement.noticePeriodDays != null && (
                    <div>
                      <p className="text-muted-foreground">Notice Period</p>
                      <p className="font-medium">{agreement.noticePeriodDays} days</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 text-sm pt-2 border-t">
                  <span className="flex items-center gap-1.5">
                    {agreement.signedByServiceUser ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    Service User Signed
                  </span>
                  <span className="flex items-center gap-1.5">
                    {agreement.signedByProvider ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    Provider Signed
                  </span>
                  <span className="flex items-center gap-1.5">
                    {agreement.inspectionReportProvided ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    Inspection Report Provided
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

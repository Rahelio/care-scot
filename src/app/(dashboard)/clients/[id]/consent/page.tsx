"use client";

import { use, useState } from "react";
import { Plus, CheckCircle, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConsentRecordForm } from "@/components/modules/clients/consent-record-form";
import { formatDate } from "@/lib/utils";
import type { ConsentType } from "@prisma/client";

const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
  CARE_AND_SUPPORT: "Care and Support",
  INFORMATION_SHARING: "Information Sharing",
  MEDICATION: "Medication Administration",
  PHOTOGRAPHY: "Photography / Video",
  OTHER: "Other",
};

export default function ConsentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [dialogOpen, setDialogOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: records, isPending } = trpc.clients.listConsentRecords.useQuery({
    serviceUserId: id,
  });

  if (isPending) {
    return <div className="py-8 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Consent Records</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Consent records cannot be deleted — only superseded by a new record
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Record Consent
        </Button>
      </div>

      {!records?.length ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-4">No consent records yet.</p>
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              Add First Consent Record
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <Card key={record.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">
                        {CONSENT_TYPE_LABELS[record.consentType] ?? record.consentType}
                      </p>
                      <Badge
                        variant="outline"
                        className={
                          record.consentGiven
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-red-100 text-red-800 border-red-200"
                        }
                      >
                        {record.consentGiven ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Consent Given
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Consent Withheld
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(record.consentDate)}
                      {record.signedBy && ` — Signed by ${record.signedBy}`}
                      {record.relationshipToServiceUser &&
                        ` (${record.relationshipToServiceUser})`}
                    </p>
                    {record.reviewDate && (
                      <p className="text-sm text-muted-foreground">
                        Review: {formatDate(record.reviewDate)}
                      </p>
                    )}
                  </div>
                </div>

                {record.capacityAssessed && (
                  <div className="mt-2 pt-2 border-t text-sm space-y-1">
                    <p className="font-medium">Capacity Assessed</p>
                    {record.capacityOutcome && (
                      <p className="text-muted-foreground">{record.capacityOutcome}</p>
                    )}
                    {record.awiDocumentation && (
                      <p className="text-muted-foreground">
                        AWI Reference: {record.awiDocumentation}
                      </p>
                    )}
                    {record.bestInterestDecision && (
                      <p className="text-muted-foreground">{record.bestInterestDecision}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConsentRecordForm
        serviceUserId={id}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => utils.clients.listConsentRecords.invalidate({ serviceUserId: id })}
      />
    </div>
  );
}

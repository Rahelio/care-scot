"use client";

import { use, useState } from "react";
import { Plus, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsentRecordForm } from "@/components/modules/clients/consent-record-form";
import { formatDate } from "@/lib/utils";
import type { ConsentType } from "@prisma/client";

const CONSENT_TYPES: { value: ConsentType; label: string; description: string }[] = [
  {
    value: "CARE_AND_SUPPORT",
    label: "Care & Support",
    description: "Consent to receive care and support services",
  },
  {
    value: "INFORMATION_SHARING",
    label: "Information Sharing",
    description: "Consent to share information with third parties",
  },
  {
    value: "MEDICATION",
    label: "Medication Administration",
    description: "Consent for medication administration",
  },
  {
    value: "PHOTOGRAPHY",
    label: "Photography / Video",
    description: "Consent for photographs or video recordings",
  },
  {
    value: "OTHER",
    label: "Other",
    description: "Other consent arrangements",
  },
];

export default function ConsentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ConsentType | undefined>();
  const utils = trpc.useUtils();

  const { data: records, isPending } = trpc.clients.listConsentRecords.useQuery({
    serviceUserId: id,
  });

  if (isPending) {
    return <div className="py-8 text-center text-muted-foreground">Loading…</div>;
  }

  // Group by type, sorted most-recent-first within each group
  const byType = Object.fromEntries(
    CONSENT_TYPES.map(({ value }) => [
      value,
      (records ?? [])
        .filter((r) => r.consentType === value)
        .sort((a, b) => new Date(b.consentDate).getTime() - new Date(a.consentDate).getTime()),
    ])
  ) as Record<ConsentType, typeof records>;

  function openForm(type?: ConsentType) {
    setSelectedType(type);
    setDialogOpen(true);
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
        <Button onClick={() => openForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Record Consent
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CONSENT_TYPES.map(({ value, label, description }) => {
          const typeRecords = byType[value] ?? [];
          const current = typeRecords[0];

          return (
            <Card
              key={value}
              className={
                current
                  ? current.consentGiven
                    ? "border-green-200"
                    : "border-red-200"
                  : "border-dashed"
              }
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-medium leading-snug">{label}</CardTitle>
                  {current ? (
                    <Badge
                      variant="outline"
                      className={
                        current.consentGiven
                          ? "bg-green-100 text-green-800 border-green-200 shrink-0"
                          : "bg-red-100 text-red-800 border-red-200 shrink-0"
                      }
                    >
                      {current.consentGiven ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Given
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Withheld
                        </>
                      )}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground shrink-0 text-xs">
                      Not recorded
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {current ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(current.consentDate)}
                      {current.signedBy && ` — ${current.signedBy}`}
                      {current.relationshipToServiceUser &&
                        ` (${current.relationshipToServiceUser})`}
                    </p>
                    {current.reviewDate && (
                      <p className="text-xs text-muted-foreground">
                        Review due: {formatDate(current.reviewDate)}
                      </p>
                    )}
                    {current.capacityAssessed && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs space-y-1">
                        <p className="font-medium flex items-center gap-1 text-amber-800">
                          <AlertCircle className="h-3 w-3" />
                          Capacity Assessed (AWI)
                        </p>
                        {current.awiDocumentation && (
                          <p className="text-amber-700">Ref: {current.awiDocumentation}</p>
                        )}
                        {current.capacityOutcome && (
                          <p className="text-amber-700">{current.capacityOutcome}</p>
                        )}
                        {current.bestInterestDecision && (
                          <p className="text-amber-700">
                            Best Interest: {current.bestInterestDecision}
                          </p>
                        )}
                      </div>
                    )}
                    {typeRecords.length > 1 && (
                      <p className="text-xs text-muted-foreground">
                        +{typeRecords.length - 1} previous record
                        {typeRecords.length > 2 ? "s" : ""}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">{description}</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => openForm(value)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {current ? "Supersede" : "Record"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ConsentRecordForm
        serviceUserId={id}
        initialConsentType={selectedType}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => utils.clients.listConsentRecords.invalidate({ serviceUserId: id })}
      />
    </div>
  );
}

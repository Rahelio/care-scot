"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { NewPageHeader } from "@/components/modules/new-page-header";
import { SafeguardingForm } from "@/components/modules/incidents/safeguarding-form";

export default function NewSafeguardingPage() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-muted-foreground">Loading…</div>}>
      <NewSafeguardingPageContent />
    </Suspense>
  );
}

function NewSafeguardingPageContent() {
  const searchParams = useSearchParams();
  // Populated when this page is reached via "Create safeguarding concern"
  // from a SAFEGUARDING-type incident (see incidents/[id]/page.tsx) — links
  // the new concern back to the incident and avoids re-keying its details.
  const incidentId = searchParams.get("incidentId") ?? undefined;
  const defaultServiceUserId = searchParams.get("serviceUserId") ?? undefined;
  const defaultServiceUserName = searchParams.get("serviceUserName") ?? undefined;
  const defaultConcernDate = searchParams.get("concernDate") ?? undefined;
  const defaultDescription = searchParams.get("description") ?? undefined;

  return (
    <div className="max-w-2xl space-y-6">
      <NewPageHeader
        backHref="/incidents?tab=safeguarding"
        backLabel="Safeguarding"
        title="Raise Safeguarding Concern"
        description="Complete this form as soon as a safeguarding concern is identified. Management will be notified immediately."
      />

      <SafeguardingForm
        incidentId={incidentId}
        defaultServiceUserId={defaultServiceUserId}
        defaultServiceUserName={defaultServiceUserName}
        defaultConcernDate={defaultConcernDate}
        defaultDescription={defaultDescription}
      />
    </div>
  );
}

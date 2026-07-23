"use client";

import { NewPageHeader } from "@/components/modules/new-page-header";
import { SafeguardingForm } from "@/components/modules/incidents/safeguarding-form";

export default function NewSafeguardingPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <NewPageHeader
        backHref="/incidents?tab=safeguarding"
        backLabel="Safeguarding"
        title="Raise Safeguarding Concern"
        description="Complete this form as soon as a safeguarding concern is identified. Management will be notified immediately."
      />

      <SafeguardingForm />
    </div>
  );
}

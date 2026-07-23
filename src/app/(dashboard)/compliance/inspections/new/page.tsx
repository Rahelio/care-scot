"use client";

import { NewPageHeader } from "@/components/modules/new-page-header";
import { InspectionForm } from "@/components/modules/compliance/inspection-form";

export default function NewInspectionPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <NewPageHeader
        backHref="/compliance?tab=inspections"
        backLabel="Inspections"
        title="Record Inspection"
        description="Record Care Inspectorate inspection results including grades, requirements, and recommendations."
      />

      <InspectionForm />
    </div>
  );
}

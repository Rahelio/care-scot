"use client";

import { NewPageHeader } from "@/components/modules/new-page-header";
import { AuditTool } from "@/components/modules/medication/audit-tool";

export default function NewMedicationAuditPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <NewPageHeader
        backHref="/medication/audits"
        backLabel="Medication Audits"
        title="New Medication Audit"
        description="Complete the structured checklist and record any issues and action items. Use Pass / Fail / N/A for each item."
      />

      <AuditTool />
    </div>
  );
}

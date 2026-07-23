"use client";

import { NewPageHeader } from "@/components/modules/new-page-header";
import { QualityAuditForm } from "@/components/modules/compliance/quality-audit-form";

export default function NewAuditPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <NewPageHeader
        backHref="/compliance?tab=audits"
        backLabel="Quality Audits"
        title="New Quality Audit"
        description="Select an audit type to begin. The checklist will be pre-populated with standard items."
      />

      <QualityAuditForm />
    </div>
  );
}

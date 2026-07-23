"use client";

import { NewPageHeader } from "@/components/modules/new-page-header";
import { ErrorReportForm } from "@/components/modules/medication/error-report-form";

export default function NewMedicationErrorPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <NewPageHeader
        backHref="/medication/errors"
        backLabel="Medication Error Log"
        title="Report a Medication Error"
        description="All medication errors must be reported promptly. Errors in NCC MERP categories E–I will automatically generate a Care Inspectorate notification and alert management."
      />

      <ErrorReportForm />
    </div>
  );
}

"use client";

import { NewPageHeader } from "@/components/modules/new-page-header";
import { ComplaintForm } from "@/components/modules/compliance/complaint-form";

export default function NewComplaintPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <NewPageHeader
        backHref="/compliance?tab=complaints"
        backLabel="Complaints"
        title="Record Complaint"
        description="Log all complaints received. The 20 working-day SLA timer starts from the date received."
      />

      <ComplaintForm />
    </div>
  );
}

"use client";

import { NewPageHeader } from "@/components/modules/new-page-header";
import { IncidentForm } from "@/components/modules/incidents/incident-form";

export default function NewIncidentPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <NewPageHeader
        backHref="/incidents"
        backLabel="Incidents"
        title="Report an Incident"
        description="All incidents must be reported as soon as possible. Critical and high-severity incidents will automatically alert management."
      />

      <IncidentForm />
    </div>
  );
}

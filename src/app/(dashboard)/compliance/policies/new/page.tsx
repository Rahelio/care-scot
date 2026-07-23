"use client";

import { NewPageHeader } from "@/components/modules/new-page-header";
import { PolicyForm } from "@/components/modules/compliance/policy-form";

export default function NewPolicyPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <NewPageHeader
        backHref="/compliance?tab=policies"
        backLabel="Policies"
        title="Add Policy"
        description="Create a new policy record. Once active, staff will be required to acknowledge it."
      />

      <PolicyForm />
    </div>
  );
}

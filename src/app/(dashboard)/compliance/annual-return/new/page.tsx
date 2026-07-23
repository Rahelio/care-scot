"use client";

import { NewPageHeader } from "@/components/modules/new-page-header";
import { AnnualReturnForm } from "@/components/modules/compliance/annual-return-form";

export default function NewAnnualReturnPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <NewPageHeader
        backHref="/compliance?tab=annual-returns"
        backLabel="Annual Returns"
        title="Start Annual Return"
        description={
          <>Create a draft annual return. Use &quot;Auto-Populate&quot; to pull live data from the system.</>
        }
      />

      <AnnualReturnForm />
    </div>
  );
}

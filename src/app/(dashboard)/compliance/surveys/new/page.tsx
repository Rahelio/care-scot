"use client";

import { NewPageHeader } from "@/components/modules/new-page-header";
import { SurveyForm } from "@/components/modules/compliance/survey-form";

export default function NewSurveyPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <NewPageHeader
        backHref="/compliance?tab=surveys"
        backLabel="Surveys"
        title="Record Survey"
        description="Record satisfaction survey feedback from service users, families, or staff."
      />

      <SurveyForm />
    </div>
  );
}

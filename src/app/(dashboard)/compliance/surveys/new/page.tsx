"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SurveyForm } from "@/components/modules/compliance/survey-form";

export default function NewSurveyPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/compliance?tab=surveys">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Surveys
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">Record Survey</h1>
        <p className="text-muted-foreground mt-1">
          Record satisfaction survey feedback from service users, families, or
          staff.
        </p>
      </div>

      <SurveyForm />
    </div>
  );
}

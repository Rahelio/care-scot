"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InspectionForm } from "@/components/modules/compliance/inspection-form";

export default function NewInspectionPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/compliance?tab=inspections">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Inspections
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">Record Inspection</h1>
        <p className="text-muted-foreground mt-1">
          Record Care Inspectorate inspection results including grades,
          requirements, and recommendations.
        </p>
      </div>

      <InspectionForm />
    </div>
  );
}

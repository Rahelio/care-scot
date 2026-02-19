"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorReportForm } from "@/components/modules/medication/error-report-form";

export default function NewMedicationErrorPage() {
  return (
    <div className="max-w-2xl space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/medication/errors">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Medication Error Log
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">Report a Medication Error</h1>
        <p className="text-muted-foreground mt-1">
          All medication errors must be reported promptly. Errors in NCC MERP
          categories E–I will automatically generate a Care Inspectorate
          notification and alert management.
        </p>
      </div>

      <ErrorReportForm />
    </div>
  );
}

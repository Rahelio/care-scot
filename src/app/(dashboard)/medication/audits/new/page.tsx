"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuditTool } from "@/components/modules/medication/audit-tool";

export default function NewMedicationAuditPage() {
  return (
    <div className="max-w-4xl space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/medication/audits">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Medication Audits
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">New Medication Audit</h1>
        <p className="text-muted-foreground mt-1">
          Complete the structured checklist and record any issues and action
          items. Use Pass / Fail / N/A for each item.
        </p>
      </div>

      <AuditTool />
    </div>
  );
}

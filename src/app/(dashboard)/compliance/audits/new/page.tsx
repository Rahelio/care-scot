"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QualityAuditForm } from "@/components/modules/compliance/quality-audit-form";

export default function NewAuditPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/compliance?tab=audits">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Quality Audits
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">New Quality Audit</h1>
        <p className="text-muted-foreground mt-1">
          Select an audit type to begin. The checklist will be pre-populated
          with standard items.
        </p>
      </div>

      <QualityAuditForm />
    </div>
  );
}

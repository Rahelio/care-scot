"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QualityAuditDetail } from "@/components/modules/compliance/quality-audit-detail";

export default function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/compliance?tab=audits">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Quality Audits
        </Link>
      </Button>

      <QualityAuditDetail auditId={id} />
    </div>
  );
}

"use client";

import { use } from "react";
import { BackLink } from "@/components/modules/back-link";
import { QualityAuditDetail } from "@/components/modules/compliance/quality-audit-detail";

export default function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="max-w-3xl space-y-6">
      <BackLink href="/compliance?tab=audits" label="Quality Audits" />

      <QualityAuditDetail auditId={id} />
    </div>
  );
}

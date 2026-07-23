"use client";

import { use } from "react";
import { BackLink } from "@/components/modules/back-link";
import { InspectionDetail } from "@/components/modules/compliance/inspection-detail";

export default function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="max-w-3xl space-y-6">
      <BackLink href="/compliance?tab=inspections" label="Inspections" />

      <InspectionDetail inspectionId={id} />
    </div>
  );
}

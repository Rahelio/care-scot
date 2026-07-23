"use client";

import { use } from "react";
import { BackLink } from "@/components/modules/back-link";
import { ComplaintDetail } from "@/components/modules/compliance/complaint-detail";

export default function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="max-w-3xl space-y-6">
      <BackLink href="/compliance?tab=complaints" label="Complaints" />

      <ComplaintDetail complaintId={id} />
    </div>
  );
}

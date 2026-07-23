"use client";

import { use } from "react";
import { BackLink } from "@/components/modules/back-link";
import { PolicyDetail } from "@/components/modules/compliance/policy-detail";

export default function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="max-w-3xl space-y-6">
      <BackLink href="/compliance?tab=policies" label="Policies" />

      <PolicyDetail policyId={id} />
    </div>
  );
}

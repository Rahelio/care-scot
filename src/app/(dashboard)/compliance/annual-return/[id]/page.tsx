"use client";

import { use } from "react";
import { BackLink } from "@/components/modules/back-link";
import { AnnualReturnForm } from "@/components/modules/compliance/annual-return-form";

export default function AnnualReturnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="max-w-3xl space-y-6">
      <BackLink href="/compliance?tab=annual-returns" label="Annual Returns" />

      <AnnualReturnForm returnId={id} />
    </div>
  );
}

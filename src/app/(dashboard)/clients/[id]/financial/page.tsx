"use client";

import { use } from "react";
import { CarePackageList } from "@/components/modules/financial/care-package-list";

export default function ClientFinancialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <CarePackageList serviceUserId={id} />;
}

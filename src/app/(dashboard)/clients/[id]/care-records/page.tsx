"use client";

import { use } from "react";
import { CareVisitList } from "@/components/modules/clients/care-visit-list";

export default function CareRecordsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <CareVisitList serviceUserId={id} />;
}

"use client";

import { use } from "react";
import { InductionList } from "@/components/modules/staff/induction-list";

export default function StaffInductionPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <InductionList staffId={id} />;
}

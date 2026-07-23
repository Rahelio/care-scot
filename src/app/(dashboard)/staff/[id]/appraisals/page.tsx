"use client";

import { use } from "react";
import { AppraisalList } from "@/components/modules/staff/appraisal-list";

export default function StaffAppraisalsPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AppraisalList staffId={id} />;
}

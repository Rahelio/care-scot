"use client";

import { use } from "react";
import { SupervisionList } from "@/components/modules/staff/supervision-list";

export default function StaffSupervisionPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <SupervisionList staffId={id} />;
}

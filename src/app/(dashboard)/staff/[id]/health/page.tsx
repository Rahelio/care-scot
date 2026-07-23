"use client";

import { use } from "react";
import { HealthList } from "@/components/modules/staff/health-list";

export default function StaffHealthPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <HealthList staffId={id} />;
}

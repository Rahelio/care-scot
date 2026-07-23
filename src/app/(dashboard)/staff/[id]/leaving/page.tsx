"use client";

import { use } from "react";
import { LeavingList } from "@/components/modules/staff/leaving-list";

export default function StaffLeavingPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <LeavingList staffId={id} />;
}

"use client";

import { use } from "react";
import { AvailabilityList } from "@/components/modules/staff/availability-list";

export default function StaffAvailabilityPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AvailabilityList staffMemberId={id} />;
}

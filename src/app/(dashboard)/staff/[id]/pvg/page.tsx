"use client";

import { use } from "react";
import { PvgList } from "@/components/modules/staff/pvg-list";
import { StaffRegistrationList } from "@/components/modules/staff/staff-registration-list";
import { StaffReferenceList } from "@/components/modules/staff/staff-reference-list";

export default function StaffPvgPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="space-y-6">
      <PvgList staffId={id} />
      <StaffRegistrationList staffId={id} />
      <StaffReferenceList staffId={id} />
    </div>
  );
}

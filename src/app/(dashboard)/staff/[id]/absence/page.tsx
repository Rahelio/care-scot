"use client";

import { use } from "react";
import { AbsenceList } from "@/components/modules/staff/absence-list";

export default function StaffAbsencePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AbsenceList staffId={id} />;
}

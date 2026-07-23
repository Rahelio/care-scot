"use client";

import { use } from "react";
import { DisciplinaryList } from "@/components/modules/staff/disciplinary-list";

export default function StaffDisciplinaryPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DisciplinaryList staffId={id} />;
}

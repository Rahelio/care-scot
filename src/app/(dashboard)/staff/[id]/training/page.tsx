"use client";

import { use } from "react";
import { TrainingList } from "@/components/modules/staff/training-list";

export default function StaffTrainingPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <TrainingList staffId={id} />;
}

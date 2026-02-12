"use client";

import { use } from "react";
import { RiskAssessmentList } from "@/components/modules/clients/risk-assessment-list";

export default function RiskAssessmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <RiskAssessmentList serviceUserId={id} />;
}

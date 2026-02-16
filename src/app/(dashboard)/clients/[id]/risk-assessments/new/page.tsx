import { redirect } from "next/navigation";

// Creation is now handled inline on the Risk Assessments tab.
export default async function NewRiskAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/clients/${id}/risk-assessments`);
}

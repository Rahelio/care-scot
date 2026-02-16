import { redirect } from "next/navigation";

// Creation is now handled inline on the Personal Plan tab.
export default async function NewPersonalPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/clients/${id}/personal-plan`);
}

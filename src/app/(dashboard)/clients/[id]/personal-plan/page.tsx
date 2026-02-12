import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PersonalPlanView } from "@/components/modules/clients/personal-plan-view";

export default async function PersonalPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([auth(), params]);
  if (!session?.user) redirect("/login");

  const { role } = session.user as { role: string };

  return <PersonalPlanView serviceUserId={id} userRole={role} />;
}

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PersonalPlanForm } from "@/components/modules/clients/personal-plan-form";

export default async function NewPersonalPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([auth(), params]);
  if (!session?.user) redirect("/login");

  const { organisationId } = session.user as { organisationId: string };

  const client = await prisma.serviceUser.findUnique({
    where: { id, organisationId },
    select: { firstName: true, lastName: true },
  });

  if (!client) notFound();

  return (
    <div className="max-w-2xl">
      <PersonalPlanForm
        serviceUserId={id}
        clientName={`${client.firstName} ${client.lastName}`}
      />
    </div>
  );
}

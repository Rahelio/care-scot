import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PersonalPlanView } from "@/components/modules/clients/personal-plan-view";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Personal Plan — CareScot" };

export default async function PersonalPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([auth(), params]);
  if (!session?.user) redirect("/login");

  const { role, organisationId } = session.user as {
    role: string;
    organisationId: string;
  };

  const serviceUser = await prisma.serviceUser.findUnique({
    where: { id, organisationId },
    select: { createdAt: true },
  });

  if (!serviceUser) notFound();

  return (
    <PersonalPlanView
      serviceUserId={id}
      serviceUserCreatedAt={serviceUser.createdAt}
      userRole={role}
    />
  );
}

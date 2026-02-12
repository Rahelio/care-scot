import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileHeader } from "@/components/modules/clients/profile-header";
import { ProfileTabs } from "@/components/modules/clients/profile-tabs";

export default async function ClientProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([auth(), params]);

  if (!session?.user) redirect("/login");

  const { organisationId } = session.user as { organisationId: string };

  const [serviceUser, activePlanCount] = await Promise.all([
    prisma.serviceUser.findUnique({
      where: { id, organisationId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        chiNumber: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.personalPlan.count({
      where: { serviceUserId: id, organisationId, status: "ACTIVE" },
    }),
  ]);

  if (!serviceUser) notFound();

  const client = { ...serviceUser, hasActivePlan: activePlanCount > 0 };

  return (
    <div className="flex flex-col min-h-full -m-6">
      <ProfileHeader client={client} />
      <ProfileTabs clientId={id} />
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileHeader } from "@/components/modules/clients/profile-header";
import { ProfileTabs } from "@/components/modules/profile-tabs";

const CLIENT_TABS = [
  { label: "Overview", suffix: "" },
  { label: "Personal Plan", suffix: "/personal-plan" },
  { label: "Risk Assessments", suffix: "/risk-assessments" },
  { label: "Health", suffix: "/health" },
  { label: "Care Records", suffix: "/care-records" },
  { label: "Consent", suffix: "/consent" },
  { label: "Agreement", suffix: "/agreement" },
  { label: "Reviews", suffix: "/reviews" },
  { label: "Timeline", suffix: "/timeline" },
  { label: "Visits", suffix: "/visits" },
  { label: "Financial", suffix: "/financial" },
];

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
      <ProfileTabs base={`/clients/${id}`} tabs={CLIENT_TABS} />
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StaffProfileHeader } from "@/components/modules/staff/staff-profile-header";
import { StaffProfileTabs } from "@/components/modules/staff/staff-profile-tabs";

export default async function StaffProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([auth(), params]);

  if (!session?.user) redirect("/login");

  const { organisationId } = session.user as { organisationId: string };

  const member = await prisma.staffMember.findUnique({
    where: { id, organisationId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      jobTitle: true,
      roleType: true,
      status: true,
      startDate: true,
    },
  });

  if (!member) notFound();

  return (
    <div className="flex flex-col min-h-full -m-6">
      <StaffProfileHeader member={member} />
      <StaffProfileTabs staffId={id} />
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}

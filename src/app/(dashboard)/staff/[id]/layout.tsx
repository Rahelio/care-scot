import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StaffProfileHeader } from "@/components/modules/staff/staff-profile-header";
import { ProfileTabs } from "@/components/modules/profile-tabs";

const STAFF_TABS = [
  { label: "Overview", suffix: "" },
  { label: "Induction", suffix: "/induction" },
  { label: "PVG & Registration", suffix: "/pvg" },
  { label: "Training", suffix: "/training" },
  { label: "Supervision", suffix: "/supervision" },
  { label: "Appraisals", suffix: "/appraisals" },
  { label: "Absence", suffix: "/absence" },
  { label: "Health", suffix: "/health" },
  { label: "Disciplinary", suffix: "/disciplinary" },
  { label: "Leaving", suffix: "/leaving" },
  { label: "Documents", suffix: "/documents" },
];

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
      <ProfileTabs base={`/staff/${id}`} tabs={STAFF_TABS} />
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}

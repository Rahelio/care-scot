import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StaffForm } from "@/components/modules/staff/staff-form";

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([auth(), params]);
  if (!session?.user) redirect("/login");

  const { organisationId } = session.user as { organisationId: string };

  const member = await prisma.staffMember.findUnique({
    where: { id, organisationId },
  });

  if (!member) notFound();

  const fmt = (d: Date | null | undefined) => d?.toISOString().split("T")[0] ?? "";

  return (
    <div className="max-w-2xl">
      <StaffForm
        staffId={id}
        initialValues={{
          firstName: member.firstName,
          lastName: member.lastName,
          dateOfBirth: fmt(member.dateOfBirth) || undefined,
          email: member.email ?? "",
          phone: member.phone ?? "",
          addressLine1: member.addressLine1 ?? "",
          addressLine2: member.addressLine2 ?? "",
          city: member.city ?? "",
          postcode: member.postcode ?? "",
          jobTitle: member.jobTitle ?? "",
          roleType: member.roleType as "CARER" | "SENIOR_CARER" | "NURSE" | "COORDINATOR" | "MANAGER" | "ADMIN" | "OTHER",
          employmentType: member.employmentType as "FULL_TIME" | "PART_TIME" | "BANK" | "AGENCY",
          startDate: fmt(member.startDate),
          contractHoursPerWeek: member.contractHoursPerWeek
            ? String(Number(member.contractHoursPerWeek))
            : "",
          probationEndDate: fmt(member.probationEndDate) || undefined,
          rightToWorkChecked: member.rightToWorkChecked,
          rightToWorkDocument: member.rightToWorkDocument ?? "",
        }}
      />
    </div>
  );
}

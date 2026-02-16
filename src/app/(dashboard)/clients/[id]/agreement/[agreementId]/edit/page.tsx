import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ServiceAgreementForm } from "@/components/modules/clients/service-agreement-form";

export default async function EditAgreementPage({
  params,
}: {
  params: Promise<{ id: string; agreementId: string }>;
}) {
  const [session, { id, agreementId }] = await Promise.all([auth(), params]);
  if (!session?.user) redirect("/login");

  const { organisationId } = session.user as { organisationId: string };

  const [client, agreement] = await Promise.all([
    prisma.serviceUser.findUnique({
      where: { id, organisationId },
      select: { firstName: true, lastName: true },
    }),
    prisma.serviceAgreement.findUnique({
      where: { id: agreementId, organisationId },
    }),
  ]);

  if (!client || !agreement) notFound();

  const fmt = (d: Date | null | undefined) => d?.toISOString().split("T")[0] ?? "";

  return (
    <div className="max-w-2xl">
      <ServiceAgreementForm
        serviceUserId={id}
        clientName={`${client.firstName} ${client.lastName}`}
        agreementId={agreementId}
        initialValues={{
          startDate: fmt(agreement.startDate),
          endDate: fmt(agreement.endDate) || undefined,
          servicesDescription: agreement.servicesDescription ?? undefined,
          visitFrequency: agreement.visitFrequency ?? undefined,
          visitDurationMinutes: agreement.visitDurationMinutes?.toString() ?? undefined,
          costPerVisit: agreement.costPerVisit ? String(agreement.costPerVisit) : undefined,
          costPerHour: agreement.costPerHour ? String(agreement.costPerHour) : undefined,
          weeklyCost: agreement.weeklyCost ? String(agreement.weeklyCost) : undefined,
          paymentTerms: agreement.paymentTerms ?? undefined,
          noticePeriodDays: agreement.noticePeriodDays?.toString() ?? undefined,
          signedByServiceUser: agreement.signedByServiceUser,
          signedByRepresentative: agreement.signedByRepresentative ?? undefined,
          signedByProvider: agreement.signedByProvider,
          agreementDate: fmt(agreement.agreementDate) || undefined,
          inspectionReportProvided: agreement.inspectionReportProvided,
        }}
      />
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ServiceUserForm } from "@/components/modules/clients/service-user-form";
import { toDateInputValue } from "@/lib/plan-warning";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([auth(), params]);
  if (!session?.user) redirect("/login");

  const { organisationId } = session.user as { organisationId: string };

  const client = await prisma.serviceUser.findUnique({
    where: { id, organisationId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      chiNumber: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      postcode: true,
      phonePrimary: true,
      phoneSecondary: true,
      email: true,
      gpName: true,
      gpPractice: true,
      gpPhone: true,
      communicationNeeds: true,
      languagePreference: true,
      interpreterRequired: true,
      culturalReligiousNeeds: true,
      dietaryRequirements: true,
    },
  });

  if (!client) notFound();

  const defaultValues = {
    ...client,
    dateOfBirth: toDateInputValue(client.dateOfBirth),
    chiNumber: client.chiNumber ?? undefined,
    addressLine1: client.addressLine1 ?? undefined,
    addressLine2: client.addressLine2 ?? undefined,
    city: client.city ?? undefined,
    postcode: client.postcode ?? undefined,
    phonePrimary: client.phonePrimary ?? undefined,
    phoneSecondary: client.phoneSecondary ?? undefined,
    email: client.email ?? undefined,
    gpName: client.gpName ?? undefined,
    gpPractice: client.gpPractice ?? undefined,
    gpPhone: client.gpPhone ?? undefined,
    communicationNeeds: client.communicationNeeds ?? undefined,
    languagePreference: client.languagePreference ?? undefined,
    interpreterRequired: client.interpreterRequired ?? undefined,
    culturalReligiousNeeds: client.culturalReligiousNeeds ?? undefined,
    dietaryRequirements: client.dietaryRequirements ?? undefined,
  };

  return (
    <div className="max-w-2xl">
      <ServiceUserForm mode="edit" clientId={id} defaultValues={defaultValues} />
    </div>
  );
}

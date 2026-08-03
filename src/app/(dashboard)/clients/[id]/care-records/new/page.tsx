import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CareVisitForm } from "@/components/modules/clients/care-visit-form";

export default async function NewCareVisitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, { id }, sp] = await Promise.all([auth(), params, searchParams]);
  if (!session?.user) redirect("/login");

  const { organisationId } = session.user as { organisationId: string };

  const client = await prisma.serviceUser.findUnique({
    where: { id, organisationId },
    select: { firstName: true, lastName: true },
  });

  if (!client) notFound();

  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

  return (
    <div className="max-w-2xl">
      <CareVisitForm
        serviceUserId={id}
        clientName={`${client.firstName} ${client.lastName}`}
        rotaVisitId={str(sp.rotaVisitId)}
        initialVisitDate={str(sp.visitDate)}
        initialScheduledStart={str(sp.startTime)}
        initialScheduledEnd={str(sp.endTime)}
      />
    </div>
  );
}

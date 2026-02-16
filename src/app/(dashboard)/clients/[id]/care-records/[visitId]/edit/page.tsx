import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CareVisitEditForm } from "@/components/modules/clients/care-visit-edit-form";

const MANAGER_ROLES = ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"];
const PAGE_LOAD_TIME = Date.now();

export default async function EditCareVisitPage({
  params,
}: {
  params: Promise<{ id: string; visitId: string }>;
}) {
  const [session, { id, visitId }] = await Promise.all([auth(), params]);
  if (!session?.user) redirect("/login");

  const { organisationId, role } = session.user as {
    organisationId: string;
    role: string;
  };

  const visit = await prisma.careVisitRecord.findUnique({
    where: { id: visitId, organisationId },
    select: {
      id: true,
      visitDate: true,
      scheduledStart: true,
      scheduledEnd: true,
      tasksCompleted: true,
      wellbeingObservations: true,
      refusedCare: true,
      refusedCareDetails: true,
      familyCommunication: true,
      conditionChanges: true,
      notes: true,
      createdAt: true,
    },
  });

  if (!visit) notFound();

  const isManager = MANAGER_ROLES.includes(role);
  const hoursSince = (PAGE_LOAD_TIME - visit.createdAt.getTime()) / (1000 * 60 * 60);
  const isLocked = hoursSince > 48;

  // Non-managers cannot edit locked records
  if (isLocked && !isManager) redirect(`/clients/${id}/care-records`);

  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const tasks = (
    visit.tasksCompleted as { task: string; completed: boolean; notes?: string }[] | null
  ) ?? [];

  return (
    <div className="max-w-2xl">
      <CareVisitEditForm
        visitId={visitId}
        serviceUserId={id}
        isLocked={isLocked}
        isManager={isManager}
        visitDate={visit.visitDate.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        scheduledStart={fmt(visit.scheduledStart)}
        scheduledEnd={fmt(visit.scheduledEnd)}
        initialValues={{
          tasksCompleted: tasks,
          wellbeingObservations: visit.wellbeingObservations ?? undefined,
          refusedCare: visit.refusedCare,
          refusedCareDetails: visit.refusedCareDetails ?? undefined,
          familyCommunication: visit.familyCommunication ?? undefined,
          conditionChanges: visit.conditionChanges ?? undefined,
          notes: visit.notes ?? undefined,
        }}
      />
    </div>
  );
}

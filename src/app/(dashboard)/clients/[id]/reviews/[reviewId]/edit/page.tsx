import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReviewForm } from "@/components/modules/clients/review-form";

export default async function EditReviewPage({
  params,
}: {
  params: Promise<{ id: string; reviewId: string }>;
}) {
  const [session, { id, reviewId }] = await Promise.all([auth(), params]);
  if (!session?.user) redirect("/login");

  const { organisationId } = session.user as { organisationId: string };

  const [client, review] = await Promise.all([
    prisma.serviceUser.findUnique({
      where: { id, organisationId },
      select: { firstName: true, lastName: true },
    }),
    prisma.serviceUserReview.findUnique({
      where: { id: reviewId, organisationId },
    }),
  ]);

  if (!client || !review) notFound();

  const fmt = (d: Date | null | undefined) => d?.toISOString().split("T")[0] ?? "";

  return (
    <div className="max-w-2xl">
      <ReviewForm
        serviceUserId={id}
        clientName={`${client.firstName} ${client.lastName}`}
        reviewId={reviewId}
        initialValues={{
          reviewDate: fmt(review.reviewDate),
          reviewType: review.reviewType,
          serviceUserFeedback: review.serviceUserFeedback ?? undefined,
          familyFeedback: review.familyFeedback ?? undefined,
          changesIdentified: review.changesIdentified ?? undefined,
          actionsTaken: review.actionsTaken ?? undefined,
          mdtMeetingNotes: review.mdtMeetingNotes ?? undefined,
          nextReviewDate: fmt(review.nextReviewDate) || undefined,
          personalPlanUpdated: review.personalPlanUpdated,
        }}
      />
    </div>
  );
}

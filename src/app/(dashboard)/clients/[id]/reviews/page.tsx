"use client";

import { use } from "react";
import Link from "next/link";
import { Plus, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

const REVIEW_TYPE_LABELS = {
  SCHEDULED: "Scheduled",
  NEEDS_CHANGE: "Needs Change",
  ANNUAL: "Annual",
} as const;

export default function ReviewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: reviews, isPending } = trpc.clients.listReviews.useQuery({
    serviceUserId: id,
  });

  if (isPending) {
    return <div className="py-8 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Reviews</h2>
        <Button asChild>
          <Link href={`/clients/${id}/reviews/new`}>
            <Plus className="h-4 w-4 mr-2" />
            Record Review
          </Link>
        </Button>
      </div>

      {!reviews?.length ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-4">No reviews recorded yet.</p>
            <Button asChild variant="outline">
              <Link href={`/clients/${id}/reviews/new`}>
                Record First Review
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{formatDate(review.reviewDate)}</p>
                      <Badge variant="outline" className="text-xs">
                        {REVIEW_TYPE_LABELS[review.reviewType]}
                      </Badge>
                      {review.personalPlanUpdated && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-blue-100 text-blue-800 border-blue-200"
                        >
                          Plan Updated
                        </Badge>
                      )}
                    </div>
                    {review.reviewer && (
                      <p className="text-sm text-muted-foreground">
                        Reviewed by:{" "}
                        {review.reviewer.name ?? review.reviewer.email}
                      </p>
                    )}
                    {review.nextReviewDate && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Next review: {formatDate(review.nextReviewDate)}
                      </p>
                    )}
                  </div>
                </div>

                {review.serviceUserFeedback && (
                  <div className="text-sm border-t pt-3">
                    <p className="font-medium mb-1">Service User Feedback</p>
                    <p className="text-muted-foreground">{review.serviceUserFeedback}</p>
                  </div>
                )}

                {review.changesIdentified && (
                  <div className="text-sm">
                    <p className="font-medium mb-1">Changes Identified</p>
                    <p className="text-muted-foreground">{review.changesIdentified}</p>
                  </div>
                )}

                {review.actionsTaken && (
                  <div className="text-sm">
                    <p className="font-medium mb-1">Actions Taken</p>
                    <p className="text-muted-foreground">{review.actionsTaken}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

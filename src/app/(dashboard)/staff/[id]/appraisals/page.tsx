"use client";

import { use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

export default function StaffAppraisalsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  use(params);

  return (
    <Card>
      <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
        <Star className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Appraisals</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Performance appraisals, competency ratings, development plans and goals.
        </p>
      </CardContent>
    </Card>
  );
}

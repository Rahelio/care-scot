"use client";

import { use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";

export default function StaffTrainingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  use(params);

  return (
    <Card>
      <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
        <GraduationCap className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Training Records</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Mandatory and additional training records with completion dates and expiry tracking.
        </p>
      </CardContent>
    </Card>
  );
}

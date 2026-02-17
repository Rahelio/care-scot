"use client";

import { use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarOff } from "lucide-react";

export default function StaffAbsencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  use(params);

  return (
    <Card>
      <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
        <CalendarOff className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Absence Records</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Sickness, holiday and unauthorised absence records with return-to-work interview tracking.
        </p>
      </CardContent>
    </Card>
  );
}

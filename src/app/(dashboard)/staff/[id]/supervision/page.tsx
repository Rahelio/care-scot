"use client";

import { use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function StaffSupervisionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  use(params);

  return (
    <Card>
      <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Supervision Sessions</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Individual, group, spot-check and observation supervision records with agreed actions.
        </p>
      </CardContent>
    </Card>
  );
}

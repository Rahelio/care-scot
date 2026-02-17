"use client";

import { use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LogOut } from "lucide-react";

export default function StaffLeavingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  use(params);

  return (
    <Card>
      <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
        <LogOut className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Leaving Documentation</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Exit interview records, reason for leaving, equipment returned checklist and final date.
        </p>
      </CardContent>
    </Card>
  );
}

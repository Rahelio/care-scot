"use client";

import { use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default function StaffPvgPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  use(params);

  return (
    <Card>
      <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
        <ShieldCheck className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">PVG &amp; Registration</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          PVG disclosure records and professional registrations (SSSC, NMC) will appear here.
        </p>
      </CardContent>
    </Card>
  );
}

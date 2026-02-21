"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InspectionDetail } from "@/components/modules/compliance/inspection-detail";

export default function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/compliance?tab=inspections">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Inspections
        </Link>
      </Button>

      <InspectionDetail inspectionId={id} />
    </div>
  );
}

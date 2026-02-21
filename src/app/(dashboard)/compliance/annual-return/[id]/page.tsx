"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnnualReturnForm } from "@/components/modules/compliance/annual-return-form";

export default function AnnualReturnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/compliance?tab=annual-returns">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Annual Returns
        </Link>
      </Button>

      <AnnualReturnForm returnId={id} />
    </div>
  );
}

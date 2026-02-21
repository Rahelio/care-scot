"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PolicyDetail } from "@/components/modules/compliance/policy-detail";

export default function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/compliance?tab=policies">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Policies
        </Link>
      </Button>

      <PolicyDetail policyId={id} />
    </div>
  );
}

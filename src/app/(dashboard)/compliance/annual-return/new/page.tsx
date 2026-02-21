"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnnualReturnForm } from "@/components/modules/compliance/annual-return-form";

export default function NewAnnualReturnPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/compliance?tab=annual-returns">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Annual Returns
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">Start Annual Return</h1>
        <p className="text-muted-foreground mt-1">
          Create a draft annual return. Use &quot;Auto-Populate&quot; to pull live
          data from the system.
        </p>
      </div>

      <AnnualReturnForm />
    </div>
  );
}

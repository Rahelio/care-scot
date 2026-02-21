"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PolicyForm } from "@/components/modules/compliance/policy-form";

export default function NewPolicyPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/compliance?tab=policies">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Policies
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">Add Policy</h1>
        <p className="text-muted-foreground mt-1">
          Create a new policy record. Once active, staff will be required to
          acknowledge it.
        </p>
      </div>

      <PolicyForm />
    </div>
  );
}

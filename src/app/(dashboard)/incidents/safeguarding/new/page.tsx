"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SafeguardingForm } from "@/components/modules/incidents/safeguarding-form";

export default function NewSafeguardingPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/incidents?tab=safeguarding">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Safeguarding
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">Raise Safeguarding Concern</h1>
        <p className="text-muted-foreground mt-1">
          Complete this form as soon as a safeguarding concern is identified.
          Management will be notified immediately.
        </p>
      </div>

      <SafeguardingForm />
    </div>
  );
}

"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComplaintForm } from "@/components/modules/compliance/complaint-form";

export default function NewComplaintPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/compliance?tab=complaints">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Complaints
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">Record Complaint</h1>
        <p className="text-muted-foreground mt-1">
          Log all complaints received. The 20 working-day SLA timer starts from
          the date received.
        </p>
      </div>

      <ComplaintForm />
    </div>
  );
}

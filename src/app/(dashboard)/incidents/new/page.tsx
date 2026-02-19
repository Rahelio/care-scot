"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IncidentForm } from "@/components/modules/incidents/incident-form";

export default function NewIncidentPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/incidents">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Incidents
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">Report an Incident</h1>
        <p className="text-muted-foreground mt-1">
          All incidents must be reported as soon as possible. Critical and
          high-severity incidents will automatically alert management.
        </p>
      </div>

      <IncidentForm />
    </div>
  );
}

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ServiceUserForm } from "@/components/modules/clients/service-user-form";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "New Service User — CareScot" };

export default function NewClientPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/clients" className="hover:text-foreground transition-colors">
          Clients
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">New Service User</span>
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Service User</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a new service user to your caseload
        </p>
      </div>
      <ServiceUserForm mode="create" />
    </div>
  );
}

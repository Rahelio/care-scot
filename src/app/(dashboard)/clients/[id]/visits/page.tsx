"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc";
import { VisitScheduleList } from "@/components/modules/financial/visit-schedule-list";

export default function ClientVisitsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: packages = [], isLoading } =
    trpc.financial.carePackages.getByServiceUser.useQuery({
      serviceUserId: id,
    });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Visit Schedule</h2>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Loading...</p>
      ) : packages.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p className="text-sm">No care packages found.</p>
          <p className="text-xs mt-1">
            Create a care package in the Financial tab before adding a visit
            schedule.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {packages.map((pkg) => (
            <VisitScheduleList
              key={pkg.id}
              carePackageId={pkg.id}
              packageName={pkg.packageName}
              funderName={pkg.funder.name}
              packageStatus={pkg.status}
            />
          ))}
        </div>
      )}
    </div>
  );
}

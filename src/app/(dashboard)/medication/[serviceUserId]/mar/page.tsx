"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Pill } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { MarChart } from "@/components/modules/medication/mar-chart";
import { formatDate } from "@/lib/utils";

export default function MarChartPage({
  params,
}: {
  params: Promise<{ serviceUserId: string }>;
}) {
  const { serviceUserId } = use(params);

  const { data: client } = trpc.clients.getProfile.useQuery({ id: serviceUserId });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/medication/${serviceUserId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">
              {client
                ? `${client.firstName} ${client.lastName} — MAR Chart`
                : "MAR Chart"}
            </h1>
            {client?.dateOfBirth && (
              <p className="text-sm text-muted-foreground">
                DOB: {formatDate(client.dateOfBirth)}
                {client.chiNumber && ` · CHI: ${client.chiNumber}`}
              </p>
            )}
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/medication/${serviceUserId}`}>
            <Pill className="h-4 w-4 mr-2" />
            Medications
          </Link>
        </Button>
      </div>

      <MarChart serviceUserId={serviceUserId} />
    </div>
  );
}

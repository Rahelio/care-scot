"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  Stethoscope,
  FileText,
  Shield,
  CheckCircle,
  RefreshCw,
  Activity,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

type EventType =
  | "CARE_VISIT"
  | "PERSONAL_PLAN"
  | "RISK_ASSESSMENT"
  | "CONSENT"
  | "REVIEW"
  | "HEALTH_RECORD"
  | "INCIDENT";

const EVENT_CONFIG: Record<
  EventType,
  { icon: React.ElementType; colour: string }
> = {
  CARE_VISIT:      { icon: Stethoscope,    colour: "text-blue-600 bg-blue-100" },
  PERSONAL_PLAN:   { icon: FileText,       colour: "text-purple-600 bg-purple-100" },
  RISK_ASSESSMENT: { icon: Shield,         colour: "text-orange-600 bg-orange-100" },
  CONSENT:         { icon: CheckCircle,    colour: "text-green-600 bg-green-100" },
  REVIEW:          { icon: RefreshCw,      colour: "text-teal-600 bg-teal-100" },
  HEALTH_RECORD:   { icon: Activity,       colour: "text-red-600 bg-red-100" },
  INCIDENT:        { icon: AlertTriangle,  colour: "text-yellow-600 bg-yellow-100" },
};

export default function TimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const { data, isPending, isError, error } = trpc.clients.getTimeline.useQuery({
    serviceUserId: id,
    limit: LIMIT,
    offset,
  });

  const base = `/clients/${id}`;

  if (isPending) {
    return <div className="py-8 text-center text-muted-foreground">Loading timeline…</div>;
  }

  if (isError) {
    return (
      <div className="py-8 text-center text-destructive">
        <p className="font-medium">Failed to load timeline</p>
        <p className="text-sm mt-1 text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const { events, total } = data;

  if (events.length === 0 && offset === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-1">
      {events.map((event, i) => {
        const config = EVENT_CONFIG[event.type as EventType] ?? {
          icon: Clock,
          colour: "text-muted-foreground bg-muted",
        };
        const Icon = config.icon;
        const href = `${base}${event.href}`;

        return (
          <div key={event.id} className="flex gap-4">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.colour}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              {i < events.length - 1 && (
                <div className="w-px flex-1 bg-border my-1" />
              )}
            </div>

            {/* Content */}
            <div className="pb-6 min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={href}
                    className="text-sm font-medium hover:underline line-clamp-2"
                  >
                    {event.title}
                  </Link>
                  {event.subtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {event.subtitle.toLowerCase().replace(/_/g, " ")}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                  {formatDate(new Date(event.date))}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {total > offset + LIMIT && (
        <div className="pt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOffset((o) => o + LIMIT)}
          >
            Load more
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center pt-2">
        Showing {Math.min(offset + events.length, total)} of {total} events
      </p>
    </div>
  );
}

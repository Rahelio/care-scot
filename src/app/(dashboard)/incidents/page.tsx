"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Plus,
  TriangleAlert,
  Shield,
  BellRing,
  ClipboardCheck,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { downloadCsv } from "@/lib/download-csv";
import { IncidentList } from "@/components/modules/incidents/incident-list";
import { SafeguardingList } from "@/components/modules/incidents/safeguarding-list";
import { CiNotificationsList } from "@/components/modules/incidents/ci-notifications-list";
import { EquipmentChecksList } from "@/components/modules/incidents/equipment-checks-list";

type Tab = "incidents" | "safeguarding" | "ci-notifications" | "equipment";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "incidents",
    label: "Incidents",
    icon: <TriangleAlert className="h-4 w-4" />,
  },
  {
    id: "safeguarding",
    label: "Safeguarding",
    icon: <Shield className="h-4 w-4" />,
  },
  {
    id: "ci-notifications",
    label: "CI Notifications",
    icon: <BellRing className="h-4 w-4" />,
  },
  {
    id: "equipment",
    label: "Equipment Checks",
    icon: <ClipboardCheck className="h-4 w-4" />,
  },
];

function IncidentsHub() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get("tab") ?? "incidents") as Tab;

  function setTab(tab: Tab) {
    router.push(`/incidents?tab=${tab}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Incidents & Safeguarding</h1>
          <p className="text-muted-foreground mt-1">
            Report and manage incidents, safeguarding concerns, Care
            Inspectorate notifications, and equipment checks.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activeTab === "incidents" && (
            <>
              <ExportIncidentsButton />
              <Button asChild>
                <Link href="/incidents/new">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Report Incident
                </Link>
              </Button>
            </>
          )}
          {activeTab === "safeguarding" && (
            <Button
              asChild
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Link href="/incidents/safeguarding/new">
                <Plus className="h-4 w-4 mr-1.5" />
                Raise Concern
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "incidents" && <IncidentsTab />}
      {activeTab === "safeguarding" && <SafeguardingTab />}
      {activeTab === "ci-notifications" && <CiNotificationsTab />}
      {activeTab === "equipment" && <EquipmentTab />}
    </div>
  );
}

export default function IncidentsPage() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-muted-foreground">Loading…</div>}>
      <IncidentsHub />
    </Suspense>
  );
}

// ─── Tab content ─────────────────────────────────────────────────────────────

function IncidentsTab() {
  const [page, setPage] = useState(1);
  const { data, isPending } = trpc.incidents.list.useQuery({ page, limit: 20 });
  const items = data?.items ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div className="space-y-4">
      {isPending ? (
        <div className="py-8 text-center text-muted-foreground">Loading…</div>
      ) : (
        <IncidentList incidents={items} />
      )}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </div>
  );
}

function SafeguardingTab() {
  const [page, setPage] = useState(1);
  const { data, isPending } = trpc.incidents.safeguarding.list.useQuery({
    page,
    limit: 20,
  });
  const items = data?.items ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-4 py-3">
        <Shield className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          All safeguarding concerns must be escalated to Adult Support &
          Protection within <strong>24 hours</strong> of being raised.
        </p>
      </div>
      {isPending ? (
        <div className="py-8 text-center text-muted-foreground">Loading…</div>
      ) : (
        <SafeguardingList concerns={items} />
      )}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </div>
  );
}

function CiNotificationsTab() {
  const [page, setPage] = useState(1);
  const { data, isPending } = trpc.incidents.ciNotifications.list.useQuery({
    page,
    limit: 20,
  });
  const { data: pendingNotifs } =
    trpc.incidents.ciNotifications.getPending.useQuery();
  const pendingCount = pendingNotifs?.length ?? 0;
  const items = data?.items ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-4 py-2.5">
          <BellRing className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <Badge className="mr-2 bg-amber-600 text-white">
              {pendingCount}
            </Badge>
            notification{pendingCount !== 1 ? "s" : ""} pending submission to
            the Care Inspectorate.
          </p>
        </div>
      )}
      {isPending ? (
        <div className="py-8 text-center text-muted-foreground">Loading…</div>
      ) : (
        <CiNotificationsList notifications={items} />
      )}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </div>
  );
}

function EquipmentTab() {
  const { data: checks, isPending } =
    trpc.incidents.equipmentChecks.listCurrent.useQuery();

  return (
    <div className="space-y-4">
      {isPending ? (
        <div className="py-8 text-center text-muted-foreground">Loading…</div>
      ) : (
        <EquipmentChecksList checks={checks ?? []} />
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
      >
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
      >
        Next
      </Button>
    </div>
  );
}

function ExportIncidentsButton() {
  const [exporting, setExporting] = useState(false);
  const { data } = trpc.reports.exportIncidents.useQuery(
    {},
    { enabled: exporting, staleTime: 0 },
  );

  useEffect(() => {
    if (data && exporting) {
      downloadCsv(data.csv, data.filename);
      setTimeout(() => {
        setExporting(false);
      }, 0);
    }
  }, [data, exporting]);

  return (
    <Button variant="outline" size="sm" onClick={() => setExporting(true)} disabled={exporting}>
      <Download className="h-4 w-4 mr-1.5" />
      {exporting ? "Exporting…" : "Export CSV"}
    </Button>
  );
}

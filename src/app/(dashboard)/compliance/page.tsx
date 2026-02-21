"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  MessageSquareWarning,
  Heart,
  ClipboardCheck,
  BarChart3,
  Search,
  FileBarChart,
} from "lucide-react";
import { ComplianceDashboard } from "@/components/modules/compliance/compliance-dashboard";
import { PolicyList } from "@/components/modules/compliance/policy-list";
import { ComplaintList } from "@/components/modules/compliance/complaint-list";
import { ComplimentList } from "@/components/modules/compliance/compliment-list";
import { QualityAuditList } from "@/components/modules/compliance/quality-audit-list";
import { SurveyList } from "@/components/modules/compliance/survey-list";
import { InspectionList } from "@/components/modules/compliance/inspection-list";
import { AnnualReturnList } from "@/components/modules/compliance/annual-return-list";

type Tab =
  | "dashboard"
  | "policies"
  | "complaints"
  | "compliments"
  | "audits"
  | "surveys"
  | "inspections"
  | "annual-returns";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  { id: "policies", label: "Policies", icon: <FileText className="h-4 w-4" /> },
  {
    id: "complaints",
    label: "Complaints",
    icon: <MessageSquareWarning className="h-4 w-4" />,
  },
  { id: "compliments", label: "Compliments", icon: <Heart className="h-4 w-4" /> },
  {
    id: "audits",
    label: "Quality Audits",
    icon: <ClipboardCheck className="h-4 w-4" />,
  },
  { id: "surveys", label: "Surveys", icon: <BarChart3 className="h-4 w-4" /> },
  {
    id: "inspections",
    label: "Inspections",
    icon: <Search className="h-4 w-4" />,
  },
  {
    id: "annual-returns",
    label: "Annual Returns",
    icon: <FileBarChart className="h-4 w-4" />,
  },
];

function ComplianceHub() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get("tab") ?? "dashboard") as Tab;

  function setTab(tab: Tab) {
    router.push(`/compliance?tab=${tab}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Compliance & Quality</h1>
        <p className="text-muted-foreground mt-1">
          Inspection readiness dashboard, policies, complaints, quality audits,
          surveys, inspections, and annual returns.
        </p>
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

      {activeTab === "dashboard" && <ComplianceDashboard />}
      {activeTab === "policies" && <PolicyList />}
      {activeTab === "complaints" && <ComplaintList />}
      {activeTab === "compliments" && <ComplimentList />}
      {activeTab === "audits" && <QualityAuditList />}
      {activeTab === "surveys" && <SurveyList />}
      {activeTab === "inspections" && <InspectionList />}
      {activeTab === "annual-returns" && <AnnualReturnList />}
    </div>
  );
}

export default function CompliancePage() {
  return (
    <Suspense
      fallback={
        <div className="py-8 text-center text-muted-foreground">Loading…</div>
      }
    >
      <ComplianceHub />
    </Suspense>
  );
}

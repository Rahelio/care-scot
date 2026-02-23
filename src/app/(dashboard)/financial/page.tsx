"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Calculator,
  FileText,
  Clock,
  Building2,
  CreditCard,
  CalendarDays,
} from "lucide-react";
import { ReconciliationPage } from "@/components/modules/financial/reconciliation-page";
import { InvoiceList } from "@/components/modules/financial/invoice-list";
import { AgedDebtPage } from "@/components/modules/financial/aged-debt-page";
import { RateCardList } from "@/components/modules/financial/rate-card-list";
import { FunderList } from "@/components/modules/financial/funder-list";
import { BankHolidayList } from "@/components/modules/financial/bank-holiday-list";

type Tab =
  | "reconciliation"
  | "invoices"
  | "aged-debt"
  | "rate-cards"
  | "funders"
  | "bank-holidays";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "reconciliation",
    label: "Reconciliation",
    icon: <Calculator className="h-4 w-4" />,
  },
  {
    id: "invoices",
    label: "Invoices",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    id: "aged-debt",
    label: "Aged Debt",
    icon: <Clock className="h-4 w-4" />,
  },
  {
    id: "rate-cards",
    label: "Rate Cards",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    id: "funders",
    label: "Funders",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    id: "bank-holidays",
    label: "Bank Holidays",
    icon: <CalendarDays className="h-4 w-4" />,
  },
];

function FinancialContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get("tab") as Tab) || "reconciliation";

  function setTab(tab: Tab) {
    router.push(`/financial?tab=${tab}`);
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="border-b bg-background">
        <div className="px-6 pt-6 pb-0">
          <h1 className="text-2xl font-bold tracking-tight">Financial</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Billing, invoicing, and financial management
          </p>
        </div>
        <nav className="-mb-px flex overflow-x-auto px-6 mt-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`shrink-0 flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {activeTab === "reconciliation" && <ReconciliationPage />}
        {activeTab === "invoices" && <InvoiceList />}
        {activeTab === "aged-debt" && <AgedDebtPage />}
        {activeTab === "rate-cards" && <RateCardList />}
        {activeTab === "funders" && <FunderList />}
        {activeTab === "bank-holidays" && <BankHolidayList />}
      </div>
    </div>
  );
}

export default function FinancialPage() {
  return (
    <Suspense>
      <FinancialContent />
    </Suspense>
  );
}

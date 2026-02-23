"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", suffix: "" },
  { label: "Personal Plan", suffix: "/personal-plan" },
  { label: "Risk Assessments", suffix: "/risk-assessments" },
  { label: "Health", suffix: "/health" },
  { label: "Care Records", suffix: "/care-records" },
  { label: "Consent", suffix: "/consent" },
  { label: "Agreement", suffix: "/agreement" },
  { label: "Reviews", suffix: "/reviews" },
  { label: "Financial", suffix: "/financial" },
];

export function ProfileTabs({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const base = `/clients/${clientId}`;

  return (
    <div className="border-b bg-background">
      <nav className="-mb-px flex overflow-x-auto px-6">
        {TABS.map((tab) => {
          const href = `${base}${tab.suffix}`;
          const isActive =
            tab.suffix === ""
              ? pathname === base || pathname === `${base}/edit`
              : pathname.startsWith(href);

          return (
            <Link
              key={tab.suffix}
              href={href}
              className={cn(
                "shrink-0 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

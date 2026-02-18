"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", suffix: "" },
  { label: "PVG & Registration", suffix: "/pvg" },
  { label: "Training", suffix: "/training" },
  { label: "Supervision", suffix: "/supervision" },
  { label: "Appraisals", suffix: "/appraisals" },
  { label: "Absence", suffix: "/absence" },
  { label: "Health", suffix: "/health" },
  { label: "Leaving", suffix: "/leaving" },
  { label: "Documents", suffix: "/documents" },
];

export function StaffProfileTabs({ staffId }: { staffId: string }) {
  const pathname = usePathname();
  const base = `/staff/${staffId}`;

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

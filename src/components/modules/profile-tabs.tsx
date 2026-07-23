"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface ProfileTab {
  label: string;
  suffix: string;
}

interface ProfileTabsProps {
  base: string;
  tabs: ProfileTab[];
}

export function ProfileTabs({ base, tabs }: ProfileTabsProps) {
  const pathname = usePathname();

  return (
    <div className="border-b bg-background">
      <nav className="-mb-px flex overflow-x-auto px-6">
        {tabs.map((tab) => {
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

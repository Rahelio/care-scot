import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard — CareScot" };

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground mt-1">Overview — coming in Phase 3</p>
    </div>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-screen">
      {/* Sidebar nav — Phase 2 */}
      <aside className="w-64 border-r bg-background shrink-0" />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SidebarNav } from "@/components/sidebar-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as {
    name?: string | null;
    email?: string | null;
    role: string;
  };

  return (
    <div className="flex h-dvh overflow-hidden">
      <SidebarNav userName={user.name ?? user.email ?? "User"} userRole={user.role} />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}

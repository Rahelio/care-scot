import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SidebarNav } from "@/components/sidebar-nav";
import { NotificationBell } from "@/components/modules/notification-bell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-dvh overflow-hidden">
      <SidebarNav
        userName={session.user.email}
        userRole={session.user.role}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-end gap-2 px-6 py-2 border-b bg-background shrink-0">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

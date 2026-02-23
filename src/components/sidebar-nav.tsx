"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Users,
  UserCog,
  Pill,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  LogOut,
  LayoutDashboard,
  Menu,
  BarChart2,
  Bell,
  Settings,
  PoundSterling,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Staff", href: "/staff", icon: UserCog },
  { label: "Medication", href: "/medication", icon: Pill },
  { label: "Incidents", href: "/incidents", icon: AlertTriangle },
  { label: "Compliance", href: "/compliance", icon: ShieldCheck },
  { label: "Financial", href: "/financial", icon: PoundSterling },
  { label: "Rota", href: "/rota", icon: Calendar },
  { label: "Reports", href: "/reports", icon: BarChart2 },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings },
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Admin",
  MANAGER: "Manager",
  SENIOR_CARER: "Senior Carer",
  CARER: "Carer",
  OFFICE_STAFF: "Office Staff",
  READ_ONLY: "Read Only",
};

interface SidebarNavProps {
  userName: string;
  userRole: string;
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserFooter({ userName, userRole }: SidebarNavProps) {
  const initials = userName
    .split("@")[0]
    .split(/[._-]/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="border-t p-3 space-y-2">
      <div className="flex items-center gap-3 px-2 py-1">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{userName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {ROLE_LABELS[userRole] ?? userRole}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground hover:text-foreground"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign out
      </Button>
    </div>
  );
}

/** Desktop sidebar — hidden on mobile */
export function SidebarNav({ userName, userRole }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-background shrink-0">
      <SidebarLogo />
      <NavLinks pathname={pathname} />
      <UserFooter userName={userName} userRole={userRole} />
    </aside>
  );
}

/** Mobile nav — hamburger button that opens a Sheet drawer */
export function MobileNav({ userName, userRole }: SidebarNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 flex flex-col" showCloseButton={false}>
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarLogo />
        <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
        <UserFooter userName={userName} userRole={userRole} />
      </SheetContent>
    </Sheet>
  );
}

function SidebarLogo() {
  return (
    <div className="flex items-center gap-2 px-4 py-4 border-b shrink-0">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
        CS
      </div>
      <div>
        <p className="font-semibold text-sm leading-none">CareScot</p>
        <p className="text-xs text-muted-foreground mt-0.5">Care Management</p>
      </div>
    </div>
  );
}

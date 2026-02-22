"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: unread = [] } = trpc.notifications.getUnread.useQuery(
    undefined,
    { refetchInterval: 30_000 },
  );

  const { data: all = [] } = trpc.notifications.getAll.useQuery({ limit: 10 });

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.getUnread.invalidate();
      utils.notifications.getAll.invalidate();
    },
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.getUnread.invalidate();
      utils.notifications.getAll.invalidate();
    },
  });

  const unreadCount = unread.length;

  function handleClick(notification: (typeof all)[number]) {
    if (!notification.isRead) {
      markRead.mutate({ id: notification.id });
    }
    if (notification.link) {
      router.push(notification.link);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative shrink-0">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto">
          {all.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            all.map((n, i) => (
              <div key={n.id}>
                <button
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-accent transition-colors",
                    !n.isRead && "bg-accent/40",
                  )}
                  onClick={() => handleClick(n)}
                >
                  <div className="flex items-start gap-2">
                    {!n.isRead && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                    <div className={cn("flex-1 min-w-0", n.isRead && "pl-4")}>
                      <p className="text-sm font-medium leading-snug truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {timeAgo(new Date(n.createdAt))}
                      </p>
                    </div>
                  </div>
                </button>
                {i < all.length - 1 && <DropdownMenuSeparator />}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <DropdownMenuSeparator />
        <div className="px-4 py-2">
          <Link
            href="/notifications"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all notifications
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

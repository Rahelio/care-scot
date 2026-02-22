"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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

type Filter = "all" | "unread";

export default function NotificationsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<Filter>("all");

  const { data: all = [], isPending } = trpc.notifications.getAll.useQuery(
    { limit: 100 },
    { refetchInterval: 30_000 },
  );

  const { data: unread = [] } = trpc.notifications.getUnread.useQuery(
    undefined,
    { refetchInterval: 30_000 },
  );

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

  const displayed = filter === "unread" ? all.filter((n) => !n.isRead) : all;
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b">
        {(["all", "unread"] as const).map((tab) => (
          <button
            key={tab}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              filter === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setFilter(tab)}
          >
            {tab === "all" ? "All" : "Unread"}
            {tab === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground px-1.5">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 w-full animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Bell className="h-10 w-10 mb-3" />
          <p className="text-sm font-medium">
            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
          </p>
          <p className="text-xs mt-1">
            {filter === "unread"
              ? "You're all caught up!"
              : "Notifications will appear here when there are compliance alerts."}
          </p>
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {displayed.map((n) => (
            <button
              key={n.id}
              className={cn(
                "w-full text-left px-4 py-4 hover:bg-accent transition-colors flex items-start gap-3",
                !n.isRead && "bg-accent/40",
              )}
              onClick={() => handleClick(n)}
            >
              {!n.isRead && (
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
              )}
              <div className={cn("flex-1 min-w-0", n.isRead && "pl-5")}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium leading-snug truncate">
                    {n.title}
                  </p>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {timeAgo(new Date(n.createdAt))}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                  {n.message}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

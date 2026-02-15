"use client";

import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { Bell, MessageSquare, UserPlus, Film } from "lucide-react";
import type { Notification } from "@/lib/supabase/types";

const TYPE_ICONS: Record<string, typeof Bell> = {
  project_shared: Film,
  comment: MessageSquare,
  invite: UserPlus,
  update: Bell,
};

interface NotificationListProps {
  notifications: Notification[];
}

export function NotificationList({ notifications }: NotificationListProps) {
  const { markAsRead } = useNotifications();

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card py-16">
        <Bell className="h-8 w-8 text-muted" />
        <p className="text-muted">No notifications yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {notifications.map((n) => {
        const Icon = TYPE_ICONS[n.type] || Bell;
        return (
          <button
            key={n.id}
            onClick={() => {
              if (!n.read) markAsRead(n.id);
            }}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
              n.read
                ? "border-border bg-card"
                : "border-primary-br bg-primary-bg/20"
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <div className="flex-1">
              <div className="text-sm font-medium">{n.title}</div>
              <div className="text-xs text-muted">{n.message}</div>
              <div className="mt-1 text-[10px] text-muted">
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
            {!n.read && (
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}

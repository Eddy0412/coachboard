"use client";

import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { Bell, MessageSquare, UserPlus, Film, CreditCard, AlertCircle } from "lucide-react";
import type { Notification } from "@/lib/supabase/types";

const TYPE_ICONS: Record<string, typeof Bell> = {
  project_shared: Film,
  comment: MessageSquare,
  invite: UserPlus,
  update: Bell,
  renewal_reminder: CreditCard,
  renewal_overdue: AlertCircle,
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
        const paymentUrl = (n.data as Record<string, string> | null)?.payment_url;
        const isPaymentNotification = n.type === "renewal_reminder" || n.type === "renewal_overdue";

        return (
          <button
            key={n.id}
            onClick={() => {
              if (!n.read) markAsRead(n.id);
              if (isPaymentNotification && paymentUrl) {
                window.open(paymentUrl, "_blank");
              }
            }}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
              n.read
                ? "border-border bg-card"
                : n.type === "renewal_overdue"
                ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
                : n.type === "renewal_reminder"
                ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20"
                : "border-primary-br bg-primary-bg/20",
              isPaymentNotification && paymentUrl && "cursor-pointer hover:opacity-90"
            )}
          >
            <Icon className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              n.type === "renewal_overdue" ? "text-red-500" :
              n.type === "renewal_reminder" ? "text-amber-500" : "text-muted"
            )} />
            <div className="flex-1">
              <div className="text-sm font-medium">{n.title}</div>
              <div className="text-xs text-muted">{n.message}</div>
              {isPaymentNotification && paymentUrl && (
                <div className="mt-1.5 text-xs font-medium text-primary">
                  Tap to pay →
                </div>
              )}
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

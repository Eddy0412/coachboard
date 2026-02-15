"use client";

import { useNotifications } from "@/hooks/use-notifications";
import { NotificationList } from "@/components/notifications/notification-list";
import { Button } from "@/components/ui/button";
import { CheckCheck } from "lucide-react";

export default function NotificationsPage() {
  const { notifications, markAllAsRead } = useNotifications();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Notifications</h1>
          <p className="text-sm text-muted">Stay up to date</p>
        </div>
        <Button variant="default" size="sm" onClick={() => markAllAsRead()}>
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </Button>
      </div>
      <NotificationList notifications={notifications} />
    </div>
  );
}

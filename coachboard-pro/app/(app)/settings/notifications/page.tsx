"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useSubscription } from "@/hooks/use-subscription";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

export default function NotificationSettingsPage() {
  const { profile } = useAuth();
  const { canUseNotifications } = useSubscription();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

  if (!canUseNotifications) {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-2xl font-extrabold">Notification Settings</h1>
        <Card className="flex items-center gap-3 p-6">
          <Lock className="h-5 w-5 text-muted" />
          <div>
            <p className="font-medium">Pro feature</p>
            <p className="text-sm text-muted">
              Email and WhatsApp notifications are available on the Pro plan.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-extrabold">Notification Settings</h1>

      <Card className="flex flex-col gap-4 p-6">
        <CardHeader>
          <CardTitle>Channels</CardTitle>
          <CardDescription>
            Choose how you want to receive notifications.
          </CardDescription>
        </CardHeader>

        <label className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <div className="text-sm font-medium">Email notifications</div>
            <div className="text-xs text-muted">
              Get notified via email for new comments, shares, and invites.
            </div>
          </div>
          <input
            type="checkbox"
            checked={emailEnabled}
            onChange={(e) => setEmailEnabled(e.target.checked)}
            className="h-5 w-5 accent-primary"
          />
        </label>

        <label className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              WhatsApp notifications
              {!profile?.phone && (
                <Badge variant="warning">No phone set</Badge>
              )}
            </div>
            <div className="text-xs text-muted">
              Get WhatsApp messages for team invites and important updates.
            </div>
          </div>
          <input
            type="checkbox"
            checked={whatsappEnabled}
            onChange={(e) => setWhatsappEnabled(e.target.checked)}
            disabled={!profile?.phone}
            className="h-5 w-5 accent-primary"
          />
        </label>

        <Button variant="primary">Save preferences</Button>
      </Card>
    </div>
  );
}

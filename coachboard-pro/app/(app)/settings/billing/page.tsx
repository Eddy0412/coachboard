"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useSubscription } from "@/hooks/use-subscription";
import { PricingCards } from "@/components/billing/pricing-cards";
import { SubscriptionBadge } from "@/components/billing/subscription-badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

export default function BillingPage() {
  const { profile } = useAuth();
  const { isPro, status } = useSubscription();
  const [loading, setLoading] = useState(false);

  const handleManage = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/webhooks/stripe?action=portal", {
        method: "POST",
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      // ignore
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-extrabold">Billing</h1>

      <Card className="flex flex-col gap-4 p-6">
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Manage your subscription and billing.
          </CardDescription>
        </CardHeader>
        <div className="flex items-center gap-3">
          <SubscriptionBadge />
          {isPro && (
            <Button
              variant="default"
              size="sm"
              onClick={handleManage}
              disabled={loading}
            >
              <ExternalLink className="h-3 w-3" />
              Manage subscription
            </Button>
          )}
        </div>
      </Card>

      {!isPro && <PricingCards />}
    </div>
  );
}

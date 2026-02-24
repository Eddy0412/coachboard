"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CreditCard } from "lucide-react";
import type { PfSubscription } from "@/lib/supabase/types";

interface PfSubscriptionCardProps {
  subscription: PfSubscription;
  provider?: "paguelofacil" | "yappy";
}

export function PfSubscriptionCard({ subscription, provider = "paguelofacil" }: PfSubscriptionCardProps) {
  const [loading, setLoading] = useState(false);
  const [canceledUntil, setCanceledUntil] = useState<string | null>(
    subscription.cancel_at_period_end ? subscription.current_period_end : null
  );

  const isYappy = provider === "yappy";
  const isPastDue = subscription.status === "past_due";
  const periodEnd = new Date(subscription.current_period_end).toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric", year: "numeric" }
  );

  const providerLabel = isYappy ? "Yappy" : "PagueloFacil";

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/paguelofacil/cancel", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setCanceledUntil(data.endsAt);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  return (
    <Card className="flex flex-col gap-4 p-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          {providerLabel} Subscription
        </CardTitle>
        <CardDescription>
          Manage your {providerLabel} billing.
        </CardDescription>
      </CardHeader>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">Plan:</span>
          <span className="font-medium">
            Pro {subscription.plan_interval === "yearly" ? "Annual" : "Monthly"} —{" "}
            ${subscription.amount_usd}/{subscription.plan_interval === "yearly" ? "yr" : "mo"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">Status:</span>
          {isPastDue ? (
            <Badge variant="danger">Past Due</Badge>
          ) : canceledUntil ? (
            <Badge variant="default">Canceling</Badge>
          ) : (
            <Badge variant="primary">Active</Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">Payment method:</span>
          <span className="font-medium">{providerLabel}</span>
        </div>

        {!canceledUntil && !isPastDue && (
          <div className="text-sm">
            <span className="text-muted">{isYappy ? "Expires:" : "Next renewal:"}</span>{" "}
            <span className="font-medium">{periodEnd}</span>
          </div>
        )}

        {canceledUntil && (
          <p className="text-sm text-muted">
            Your subscription ends on{" "}
            <span className="font-medium text-foreground">{periodEnd}</span>.
            You&apos;ll keep Pro access until then.
          </p>
        )}

        {isPastDue && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <p>
              Your last payment failed. Please update your payment method to
              continue your Pro subscription.
            </p>
          </div>
        )}

        {/* Only show cancel for PagueloFacil (has auto-renewal). Yappy is manual. */}
        {!isYappy && !canceledUntil && !isPastDue && (
          <Button
            variant="default"
            size="sm"
            onClick={handleCancel}
            disabled={loading}
            className="w-fit"
          >
            {loading ? "Canceling..." : "Cancel Auto-Renewal"}
          </Button>
        )}
      </div>
    </Card>
  );
}

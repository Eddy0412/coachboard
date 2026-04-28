"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { useSubscription } from "@/hooks/use-subscription";
import { PricingCards } from "@/components/billing/pricing-cards";
import { SubscriptionBadge } from "@/components/billing/subscription-badge";
import { PfSubscriptionCard } from "@/components/billing/pf-subscription-card";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PfSubscription } from "@/lib/supabase/types";

export default function BillingPage() {
  const { profile } = useAuth();
  const { isPro, status } = useSubscription();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [pfSub, setPfSub] = useState<PfSubscription | null>(null);

  const paymentProvider = (profile as Record<string, unknown> | null)?.payment_provider as string | null;
  const isStripe = paymentProvider === "stripe" || (!paymentProvider && isPro);
  const isPagueloFacil = paymentProvider === "paguelofacil";
  const isYappy = paymentProvider === "yappy";
  const hasPfSubscription = isPagueloFacil || isYappy;

  // Show toast from URL params
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      // Could integrate a toast library here; for now the URL param serves as feedback
    }
  }, [searchParams]);

  // Fetch subscription if provider is paguelofacil or yappy
  useEffect(() => {
    if (!hasPfSubscription || !profile?.id) return;
    const supabase = createClient();
    supabase
      .from("pf_subscriptions")
      .select("*")
      .eq("user_id", profile.id)
      .in("status", ["active", "past_due"])
      .single()
      .then(({ data }) => {
        if (data) setPfSub(data as PfSubscription);
      });
  }, [hasPfSubscription, profile?.id]);

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

      {searchParams.get("success") === "true" && (
        <div className="rounded-md border border-success/20 bg-success/5 p-3 text-sm text-success">
          Payment successful! Your Pro subscription is now active.
        </div>
      )}
      {searchParams.get("canceled") === "true" && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          Payment was canceled or declined. Please try again.
        </div>
      )}

      <Card className="flex flex-col gap-4 p-6">
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Manage your subscription and billing.
          </CardDescription>
        </CardHeader>
        <div className="flex items-center gap-3">
          <SubscriptionBadge />
          {isPro && isStripe && (
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

      {isPro && profile?.grandfathered && (
        <div className="rounded-md border border-success/30 bg-success/5 p-3 text-sm text-success">
          🔒 You&apos;re on <strong>grandfathered pricing</strong> — your rate is locked in for life as a founding member. New subscribers pay $39/mo or $299/yr.
        </div>
      )}

      {isPro && hasPfSubscription && pfSub && (
        <PfSubscriptionCard subscription={pfSub} provider={paymentProvider as "paguelofacil" | "yappy"} />
      )}

      {!isPro && <PricingCards />}
    </div>
  );
}

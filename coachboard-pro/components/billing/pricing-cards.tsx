"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";

const PRO_FEATURES = [
  "Unlimited projects",
  "Unlimited teams & athletes",
  "Email & WhatsApp notifications",
  "Share links",
  "Comments & collaboration",
  "Full telestration (all colors)",
  "CSV import/export",
  "Priority support",
];

const FREE_FEATURES = [
  "3 projects",
  "1 team, 10 athletes",
  "Basic telestration (3 colors)",
  "All core video features",
];

export function PricingCards() {
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null);

  const handleUpgrade = async (interval: "monthly" | "yearly") => {
    setLoading(interval);
    try {
      const res = await fetch("/api/webhooks/stripe?action=checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      // ignore
    }
    setLoading(null);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Free tier */}
      <Card className="flex flex-col gap-4 p-6">
        <div>
          <h3 className="text-lg font-bold">Free</h3>
          <p className="text-2xl font-extrabold">
            $0<span className="text-sm font-normal text-muted">/month</span>
          </p>
        </div>
        <ul className="flex flex-col gap-2">
          {FREE_FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-muted">
              <Check className="h-3 w-3 text-muted" />
              {f}
            </li>
          ))}
        </ul>
        <Button variant="default" disabled>
          Current plan
        </Button>
      </Card>

      {/* Pro tier */}
      <Card className="flex flex-col gap-4 border-primary-br p-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold">Pro</h3>
          <Badge variant="primary">
            <Sparkles className="mr-1 h-3 w-3" />
            Recommended
          </Badge>
        </div>
        <p className="text-2xl font-extrabold">
          $19<span className="text-sm font-normal text-muted">/month</span>
        </p>
        <p className="text-xs text-muted">or $190/year (save 17%)</p>
        <ul className="flex flex-col gap-2">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <Check className="h-3 w-3 text-success" />
              {f}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            onClick={() => handleUpgrade("monthly")}
            disabled={loading !== null}
          >
            {loading === "monthly" ? "Redirecting..." : "Upgrade monthly"}
          </Button>
          <Button
            variant="default"
            onClick={() => handleUpgrade("yearly")}
            disabled={loading !== null}
          >
            {loading === "yearly" ? "Redirecting..." : "Upgrade yearly ($190/yr)"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

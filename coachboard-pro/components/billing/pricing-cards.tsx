"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Check, Sparkles, Crown, CheckCircle, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const FREE_FEATURES = [
  "2 projects",
  "1 team, 10 athletes",
  "Basic telestration (3 colors)",
  "All core video features",
];

const PRO_FEATURES = [
  "Unlimited projects",
  "1 team, unlimited athletes",
  "Email & WhatsApp notifications",
  "Share links",
  "Comments & collaboration",
  "Full telestration (all colors)",
  "CSV import/export",
  "Priority support",
];

const ELITE_FEATURES = [
  "Everything in Pro",
  "Unlimited teams & athletes",
  "Advanced analytics & reports",
  "Practice Mode (local private videos)",
  "Team usage insights",
];

type PaymentMethod = "stripe" | "paguelofacil" | "yappy";

export function PricingCards() {
  const { profile, user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("paguelofacil");

  // Yappy modal state
  const [yappyOpen, setYappyOpen] = useState(false);
  const [yappyName, setYappyName] = useState(profile?.full_name || "");
  const [yappyPhone, setYappyPhone] = useState(profile?.phone || "");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [yappySubmitted, setYappySubmitted] = useState(false);
  const [yappyLoading, setYappyLoading] = useState(false);

  // Fetch user's teams for Yappy form
  const { data: teams = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["my-teams", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: memberships } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .eq("status", "accepted");
      if (!memberships?.length) return [];
      const teamIds = memberships.map((m: { team_id: string }) => m.team_id);
      const { data: teamData } = await supabase
        .from("teams")
        .select("id, name")
        .in("id", teamIds);
      return (teamData ?? []) as { id: string; name: string }[];
    },
    enabled: !!user,
  });

  const handleUpgrade = async (interval: "monthly" | "yearly") => {
    setLoading(interval);
    try {
      const endpoint =
        paymentMethod === "paguelofacil"
          ? "/api/paguelofacil/checkout"
          : "/api/webhooks/stripe?action=checkout";
      const res = await fetch(endpoint, {
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

  const handleYappyRequest = async () => {
    if (!yappyName.trim() || !yappyPhone.trim()) return;
    setYappyLoading(true);
    try {
      const teamId = selectedTeamId || teams[0]?.id || "";
      const teamName = teams.find((t) => t.id === teamId)?.name || "";
      const res = await fetch("/api/yappy/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: yappyName.trim(),
          phone: yappyPhone.trim(),
          teamId,
          teamName,
        }),
      });
      const data = await res.json();
      if (data.success) setYappySubmitted(true);
    } catch {
      // ignore
    }
    setYappyLoading(false);
  };

  const resetYappy = () => {
    setYappyOpen(false);
    setYappySubmitted(false);
    setYappyName(profile?.full_name || "");
    setYappyPhone(profile?.phone || "");
  };

  const toggleButtons: { key: PaymentMethod; label: string }[] = [
    { key: "stripe", label: "Stripe" },
    { key: "paguelofacil", label: "PagueloFacil" },
    { key: "yappy", label: "Yappy" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Payment method toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted">Pay with:</span>
        <div className="inline-flex rounded-md border border-border">
          {toggleButtons.map((btn, i) => {
            const isDisabled = btn.key === "stripe";
            return (
              <button
                key={btn.key}
                type="button"
                disabled={isDisabled}
                onClick={() => !isDisabled && setPaymentMethod(btn.key)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  i === 0 ? "rounded-l-md" : ""
                } ${i === toggleButtons.length - 1 ? "rounded-r-md" : ""} ${
                  isDisabled
                    ? "opacity-50 cursor-not-allowed bg-transparent text-muted"
                    : paymentMethod === btn.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent text-muted hover:text-foreground"
                }`}
              >
                {btn.label}
                {isDisabled && (
                  <span className="ml-1 text-xs">(coming soon)</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {paymentMethod === "yappy" && (
        <p className="text-xs text-muted">
          Yappy is available for the yearly plan only ($299/yr). Click the yearly button to submit a payment request.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Free tier */}
        <Card className="flex flex-col gap-4 p-6">
          <div>
            <h3 className="text-lg font-bold">Free</h3>
            <p className="text-2xl font-extrabold">
              $0<span className="text-sm font-normal text-muted">/month</span>
            </p>
            <p className="text-xs text-muted">Get started at no cost</p>
          </div>
          <ul className="flex flex-1 flex-col gap-2">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-muted">
                <Check className="h-3 w-3 shrink-0 text-muted" />
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
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold">Pro</h3>
              <Badge variant="primary">
                <Sparkles className="mr-1 h-3 w-3" />
                Recommended
              </Badge>
            </div>
            <p className="text-2xl font-extrabold">
              $39<span className="text-sm font-normal text-muted">/month</span>
            </p>
            <p className="text-xs text-muted">or $299/year (save 36%)</p>
          </div>
          <ul className="flex flex-1 flex-col gap-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <Check className="h-3 w-3 shrink-0 text-success" />
                {f}
              </li>
            ))}
          </ul>

          {/* Stripe / PagueloFacil: both interval buttons */}
          {paymentMethod !== "yappy" && (
            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                onClick={() => handleUpgrade("monthly")}
                disabled={loading !== null}
              >
                {loading === "monthly" ? "Redirecting..." : "Upgrade — $39/mo"}
              </Button>
              <Button
                variant="default"
                onClick={() => handleUpgrade("yearly")}
                disabled={loading !== null}
              >
                {loading === "yearly" ? "Redirecting..." : "Upgrade — $299/yr"}
              </Button>
            </div>
          )}

          {/* Yappy: yearly only button opens modal */}
          {paymentMethod === "yappy" && (
            <Button
              variant="primary"
              onClick={() => setYappyOpen(true)}
            >
              Upgrade — $299/yr
            </Button>
          )}
        </Card>

        {/* Elite tier */}
        <Card className="relative flex flex-col gap-4 border-border p-6 opacity-80">
          <div className="absolute right-4 top-4">
            <Badge>Coming Soon</Badge>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold">Elite</h3>
              <Crown className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-extrabold">
              TBD
            </p>
            <p className="text-xs text-muted">For programs that need more</p>
          </div>
          <ul className="flex flex-1 flex-col gap-2">
            {ELITE_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-muted">
                <Check className="h-3 w-3 shrink-0 text-muted" />
                {f}
              </li>
            ))}
          </ul>
          <Button variant="default" disabled>
            Coming Soon
          </Button>
        </Card>
      </div>

      {/* Yappy Payment Request Dialog */}
      <Dialog open={yappyOpen} onOpenChange={(open) => !open && resetYappy()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {yappySubmitted ? "Request Submitted" : "Yappy Payment Request"}
            </DialogTitle>
            {!yappySubmitted && (
              <DialogDescription>
                Pro Annual Plan — $299/yr. Submit your details and we&apos;ll process
                your Yappy payment within 24 hours.
              </DialogDescription>
            )}
          </DialogHeader>

          {yappySubmitted ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle className="h-10 w-10 text-success" />
              <p className="text-sm text-muted">
                We&apos;ve received your Yappy payment request for the <strong>Pro Annual Plan ($299/yr)</strong>.
                We&apos;ll process your payment and activate your account within 24 hours.
              </p>
              <Button variant="primary" onClick={resetYappy}>
                Done
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {teams.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Team</label>
                  {teams.length === 1 ? (
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-input px-3 py-2 text-sm">
                      <Users className="h-4 w-4 text-muted" />
                      {teams[0].name}
                      <span className="ml-auto text-xs text-muted font-mono">
                        {teams[0].id.slice(0, 8)}
                      </span>
                    </div>
                  ) : (
                    <select
                      className="flex h-10 rounded-xl border border-border bg-input px-3 py-2 text-sm text-text"
                      value={selectedTeamId || teams[0]?.id}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                    >
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="Your full name"
                  value={yappyName}
                  onChange={(e) => setYappyName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Yappy Phone Number</label>
                <Input
                  type="tel"
                  placeholder="e.g. +507 6xxx-xxxx"
                  value={yappyPhone}
                  onChange={(e) => setYappyPhone(e.target.value)}
                  required
                />
              </div>
              <Button
                variant="primary"
                onClick={handleYappyRequest}
                disabled={yappyLoading || !yappyName.trim() || !yappyPhone.trim()}
              >
                {yappyLoading ? "Submitting..." : "Submit Request — $240/yr"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

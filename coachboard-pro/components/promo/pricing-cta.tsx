"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle } from "lucide-react";
import { PROMO_PRICE_USD } from "@/lib/promo";

const PROMO_REDIRECT = "/promo";

export function PromoPricingCta({ campaignEnded }: { campaignEnded: boolean }) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [pfLoading, setPfLoading] = useState(false);

  const [yappyOpen, setYappyOpen] = useState(false);
  const [yappyName, setYappyName] = useState(profile?.full_name || "");
  const [yappyPhone, setYappyPhone] = useState(profile?.phone || "");
  const [yappySubmitted, setYappySubmitted] = useState(false);
  const [yappyLoading, setYappyLoading] = useState(false);

  const goAuth = () => {
    router.push(`/login?redirect=${encodeURIComponent(PROMO_REDIRECT)}`);
  };

  const handlePagueloFacil = async () => {
    if (!user) return goAuth();
    setPfLoading(true);
    try {
      const res = await fetch("/api/paguelofacil/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: "promo" }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      // ignore
    }
    setPfLoading(false);
  };

  const handleYappyRequest = async () => {
    if (!yappyName.trim() || !yappyPhone.trim()) return;
    setYappyLoading(true);
    try {
      const res = await fetch("/api/yappy/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: yappyName.trim(),
          phone: yappyPhone.trim(),
          plan: "promo",
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
  };

  return (
    <div id="pricing" className="mx-auto w-full max-w-md px-6">
      <Card className="flex flex-col gap-4 border-primary-br p-6">
        <div className="text-center">
          <p className="text-sm text-muted">One-time payment</p>
          <p className="text-4xl font-extrabold">${PROMO_PRICE_USD}</p>
          <p className="text-xs text-muted">Pro access through Dec 31, 2026</p>
        </div>

        {campaignEnded ? (
          <p className="text-center text-sm text-muted">
            This offer has ended. Check the regular Pro plans on the billing page.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              onClick={handlePagueloFacil}
              disabled={pfLoading}
            >
              {pfLoading ? "Redirecting..." : "Pagar con Tarjeta"}
            </Button>
            <Button
              variant="default"
              onClick={() => (user ? setYappyOpen(true) : goAuth())}
            >
              Pay with Yappy
            </Button>
          </div>
        )}
      </Card>

      <Dialog open={yappyOpen} onOpenChange={(open) => !open && resetYappy()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {yappySubmitted ? "Request Submitted" : "Yappy Payment Request"}
            </DialogTitle>
            {!yappySubmitted && (
              <DialogDescription>
                Promo Plan — ${PROMO_PRICE_USD} one-time. Submit your details and
                we&apos;ll process your Yappy payment within 24 hours.
              </DialogDescription>
            )}
          </DialogHeader>

          {yappySubmitted ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle className="h-10 w-10 text-success" />
              <p className="text-sm text-muted">
                We&apos;ve received your Yappy payment request for the{" "}
                <strong>Promo Plan (${PROMO_PRICE_USD})</strong>. We&apos;ll
                process your payment and activate your account within 24 hours.
              </p>
              <Button variant="primary" onClick={resetYappy}>
                Done
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
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
                {yappyLoading ? "Submitting..." : `Submit Request — $${PROMO_PRICE_USD}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

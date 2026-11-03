import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Crown } from "lucide-react";
import { TIER_AUDIENCE } from "@/lib/pricing-constants";

interface PricingTier {
  key: keyof typeof TIER_AUDIENCE;
  name: string;
  price: string;
  priceSuffix: string;
  blurb: string;
  features: string[];
  cta: { label: string; href: string };
  recommended?: boolean;
  comingSoon?: boolean;
}

const TIERS: PricingTier[] = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    priceSuffix: "/month",
    blurb: "Get started at no cost",
    features: ["2 projects", "1 team, 10 athletes", "Basic telestration (3 colors)", "All core video features"],
    cta: { label: "Start for free", href: "/signup" },
  },
  {
    key: "pro",
    name: "Pro",
    price: "$39",
    priceSuffix: "/month",
    blurb: "or $299/year (save 36%)",
    recommended: true,
    features: [
      "Unlimited projects",
      "1 team, unlimited athletes",
      "Full telestration (all colors)",
      "Share links, comments & collaboration",
      "Priority support",
    ],
    cta: { label: "Start with Pro", href: "/signup" },
  },
  {
    key: "elite",
    name: "Elite",
    price: "TBD",
    priceSuffix: "",
    blurb: "For programs that need more",
    comingSoon: true,
    features: ["Everything in Pro", "Unlimited teams & athletes", "Advanced analytics & reports", "Team usage insights"],
    cta: { label: "Coming soon", href: "/signup" },
  },
];

export function LandingPricingSection() {
  return (
    <div id="pricing" className="mx-auto w-full max-w-4xl px-6">
      <div className="mb-8 text-center">
        <p className="mb-2 text-xs font-bold tracking-wide text-primary">PRICING</p>
        <h2 className="mb-3 text-3xl font-extrabold leading-tight sm:text-4xl">
          Simple pricing for every coaching staff.
        </h2>
        <p className="mx-auto max-w-xl text-muted">
          Start free. Upgrade when your program is ready to scout and share at scale.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {TIERS.map((tier) => (
          <Card
            key={tier.key}
            className={`relative flex flex-col gap-4 p-6 ${tier.recommended ? "border-primary-br" : ""} ${
              tier.comingSoon ? "opacity-80" : ""
            }`}
          >
            {tier.comingSoon && (
              <div className="absolute right-4 top-4">
                <Badge>Coming Soon</Badge>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">{tier.name}</h3>
                {tier.recommended && (
                  <Badge variant="primary">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Recommended
                  </Badge>
                )}
                {tier.key === "elite" && <Crown className="h-4 w-4 text-amber-500" />}
              </div>
              <p className="text-2xl font-extrabold">
                {tier.price}
                <span className="text-sm font-normal text-muted">{tier.priceSuffix}</span>
              </p>
              <p className="text-xs text-muted">{tier.blurb}</p>
            </div>

            <ul className="flex flex-1 flex-col gap-2">
              {tier.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted">
                  <Check className="h-3 w-3 shrink-0 text-muted" />
                  {f}
                </li>
              ))}
            </ul>

            <Link href={tier.cta.href}>
              <Button variant={tier.recommended ? "primary" : "default"} className="w-full" disabled={tier.comingSoon}>
                {tier.cta.label}
              </Button>
            </Link>

            <div className="border-t border-border pt-3 text-center text-xs uppercase tracking-wide text-muted">
              {TIER_AUDIENCE[tier.key]}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

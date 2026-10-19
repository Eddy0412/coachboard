import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PROMO_PRICE_USD, PRO_ACCESS_UNTIL } from "@/lib/promo";

const PRO_ACCESS_UNTIL_LABEL = PRO_ACCESS_UNTIL.toLocaleDateString("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export function PromoHero({
  campaignEnded,
  windowEndLabel,
}: {
  campaignEnded: boolean;
  windowEndLabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
      <Badge variant={campaignEnded ? "default" : "primary"}>
        {campaignEnded ? "This offer has ended" : `Offer ends ${windowEndLabel}`}
      </Badge>

      <div className="max-w-2xl">
        <h1 className="mb-4 text-4xl font-extrabold leading-tight sm:text-5xl">
          Get Coachboard Pro
          <br />
          <span className="text-primary">for the rest of the year.</span>
        </h1>
        <p className="text-lg text-muted">
          Unlimited projects, full telestration, share links, and priority
          support — one payment, no subscription, access through{" "}
          {PRO_ACCESS_UNTIL_LABEL}.
        </p>
      </div>

      <div className="flex flex-col items-center gap-1">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-extrabold">${PROMO_PRICE_USD}</span>
          <span className="text-sm text-muted">one-time</span>
        </div>
        <p className="text-xs text-muted line-through">Regular price $299/yr</p>
      </div>

      {!campaignEnded && (
        <Link href="#pricing">
          <Button variant="primary" size="lg">
            Claim the offer
          </Button>
        </Link>
      )}
    </div>
  );
}

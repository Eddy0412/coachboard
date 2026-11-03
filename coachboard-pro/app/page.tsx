import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CampaignBanner } from "@/components/promo/campaign-banner";
import { PromoVideo } from "@/components/promo/video-section";
import { PromoStatsBar } from "@/components/promo/stats-bar";
import { PromoTestimonials } from "@/components/promo/testimonials";
import { LandingPricingSection } from "@/components/landing/pricing-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { VideoBreakdownHighlight } from "@/components/landing/video-breakdown-highlight";
import { TelestrationHighlight } from "@/components/landing/telestration-highlight";
import { CoachIqHighlight } from "@/components/landing/coachiq-highlight";
import { LandingFaq } from "@/components/landing/faq-accordion";
import { ClosingCta } from "@/components/landing/closing-cta";
import { PROMO_WINDOW_END } from "@/lib/promo";

// Campaign banner visibility is time-sensitive — never statically freeze it.
export const dynamic = "force-dynamic";

export default function LandingPage() {
  const promoActive = Date.now() < PROMO_WINDOW_END.getTime();

  return (
    <div className="flex min-h-screen flex-col">
      {promoActive && (
        <CampaignBanner
          message="Get Coachboard Pro for the rest of the year — $29.99, one payment."
          ctaLabel="See the offer"
          href="/promo?utm_source=site&utm_medium=banner&utm_campaign=last_trimester_promo"
          dismissKey="last_trimester_promo"
        />
      )}
      <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Image src="/logo.png" alt="Coachboard Pro logo" width={32} height={32} className="shrink-0" />
          <h1 className="truncate text-lg font-extrabold sm:text-xl">Coachboard Pro</h1>
          <span className="hidden shrink-0 rounded-full border border-border bg-pill px-2.5 py-0.5 text-xs text-muted sm:inline-flex">
            v2.0
          </span>
        </div>
        <nav className="flex shrink-0 items-center gap-3">
          <Link href="#pricing" className="hidden text-sm font-medium text-muted hover:text-text sm:block">
            Pricing
          </Link>
          <ThemeToggle />
          <Link href="/login" className="hidden sm:block">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button variant="primary">Get started</Button>
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col gap-14 pb-20 pt-10">
        <div className="flex flex-col items-center gap-8 px-6 text-center">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-bold tracking-wide text-primary">BUILT FOR FOOTBALL PROGRAMS</p>
            <h2 className="mb-4 text-4xl font-extrabold leading-tight sm:text-5xl">
              Film breakdown.
              <br />
              <span className="text-primary">Built for coaches.</span>
            </h2>
            <p className="text-lg text-muted">
              Timestamp key plays, draw telestrations, tag athletes, and
              collaborate with your football coaching staff — all in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button variant="primary" size="lg">
                Start coaching for free
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg">Sign in to your account</Button>
            </Link>
          </div>
          <p className="text-xs text-muted">Your film stays private — only your team ever sees it.</p>
        </div>

        <PromoVideo />
        <PromoStatsBar />
        <HowItWorks />

        <VideoBreakdownHighlight />
        <TelestrationHighlight />
        <CoachIqHighlight />
        <PromoTestimonials />
        <LandingPricingSection />
        <LandingFaq />
        <ClosingCta />
      </main>

      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted">
        Coachboard Pro &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

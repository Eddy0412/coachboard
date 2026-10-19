import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { PromoHero } from "@/components/promo/hero";
import { PromoVideo } from "@/components/promo/video-section";
import { PromoStatsBar } from "@/components/promo/stats-bar";
import { PromoTestimonials } from "@/components/promo/testimonials";
import { PromoFaq } from "@/components/promo/faq-accordion";
import { PromoPricingCta } from "@/components/promo/pricing-cta";
import { PROMO_WINDOW_END } from "@/lib/promo";

// Time-sensitive campaign — never statically freeze the "has this ended?" check.
export const dynamic = "force-dynamic";

export default function PromoPage() {
  const campaignEnded = Date.now() >= PROMO_WINDOW_END.getTime();
  const windowEndLabel = new Date(
    PROMO_WINDOW_END.getTime() - 24 * 60 * 60 * 1000
  ).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Image src="/logo.png" alt="Coachboard Pro logo" width={32} height={32} className="shrink-0" />
          <h1 className="truncate text-lg font-extrabold sm:text-xl">Coachboard Pro</h1>
        </Link>
        <nav className="flex shrink-0 items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="hidden sm:block">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button variant="primary">Get started</Button>
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col gap-12 pb-20">
        <PromoHero campaignEnded={campaignEnded} windowEndLabel={windowEndLabel} />
        <PromoVideo />
        <PromoStatsBar />
        <PromoTestimonials />
        <PromoPricingCta campaignEnded={campaignEnded} />
        <PromoFaq />
      </main>

      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted">
        Coachboard Pro &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

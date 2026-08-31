import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Image src="/logo.png" alt="Coachboard Pro logo" width={32} height={32} className="shrink-0" />
          <h1 className="truncate text-lg font-extrabold sm:text-xl">Coachboard Pro</h1>
          <span className="hidden shrink-0 rounded-full border border-border bg-pill px-2.5 py-0.5 text-xs text-muted sm:inline-flex">
            v2.0
          </span>
        </div>
        <nav className="flex shrink-0 items-center gap-3">
          <Link href="/login" className="hidden sm:block">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button variant="primary">Get started</Button>
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
        <div className="max-w-2xl">
          <h2 className="mb-4 text-4xl font-extrabold leading-tight sm:text-5xl">
            Film breakdown.
            <br />
            <span className="text-primary">Built for coaches.</span>
          </h2>
          <p className="text-lg text-muted">
            Timestamp key moments, draw telestrations, tag athletes, and
            collaborate with your coaching staff — all in one place.
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

        <div className="mt-8 grid max-w-4xl gap-6 sm:grid-cols-3">
          {[
            {
              title: "Video Breakdown",
              desc: "Load any YouTube video, create timestamped coaching points, and add detailed notes for each play.",
            },
            {
              title: "Telestration",
              desc: "Draw directly on the video with multiple colors and sizes. Drawings are saved per timestamp.",
            },
            {
              title: "Team Collaboration",
              desc: "Invite coaches and athletes, share projects, add comments, and get real-time notifications.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 text-left"
            >
              <h3 className="mb-2 font-bold">{f.title}</h3>
              <p className="text-sm text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted">
        Coachboard Pro &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

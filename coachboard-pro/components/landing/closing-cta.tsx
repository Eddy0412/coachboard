import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ClosingCta() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <Card className="flex flex-col items-center gap-4 border-primary-br p-10 text-center">
        <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">
          Ready to break down your next game?
        </h2>
        <p className="max-w-md text-muted">
          Start free — no credit card required. Your first project is minutes away.
        </p>
        <Link href="/signup">
          <Button variant="primary" size="lg">
            Start coaching for free
          </Button>
        </Link>
      </Card>
    </div>
  );
}

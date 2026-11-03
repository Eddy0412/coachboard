import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export function CoachIqHighlight() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="grid items-center gap-8 sm:grid-cols-2">
        <div className="text-left">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            COACHIQ — AI INSIGHTS
          </p>
          <h2 className="mb-3 text-3xl font-extrabold leading-tight sm:text-4xl">Every throw, mapped.</h2>
          <p className="text-muted">
            Tag plays as you break down film and CoachIQ builds a pass-target heatmap and a full written
            scouting report automatically — tendencies, personnel groupings, and red-zone patterns, ready
            before your next practice.
          </p>
        </div>
        <Card className="overflow-hidden p-0">
          <Image
            src="/coachiq-screenshot.jpg"
            alt="CoachIQ AI pass-target heatmap and scouting report"
            width={1130}
            height={720}
            className="h-full w-full"
          />
        </Card>
      </div>
    </div>
  );
}

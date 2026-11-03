import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Film } from "lucide-react";

export function VideoBreakdownHighlight() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="grid items-center gap-8 sm:grid-cols-2">
        <div className="text-left">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wide text-primary">
            <Film className="h-3.5 w-3.5" />
            VIDEO BREAKDOWN
          </p>
          <h2 className="mb-3 text-3xl font-extrabold leading-tight sm:text-4xl">Every play, timestamped.</h2>
          <p className="text-muted">
            Load any YouTube video and create timestamped coaching points as you watch. Tag down, distance,
            formation, and personnel for every play — notes stay attached to the exact moment they happened.
          </p>
        </div>
        <Card className="overflow-hidden p-0">
          <Image
            src="/video-breakdown-screenshot.jpg"
            alt="Timestamp editor tagging down, distance, and formation on a game play"
            width={1920}
            height={650}
            className="h-full w-full"
          />
        </Card>
      </div>
    </div>
  );
}

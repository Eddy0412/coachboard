import Image from "next/image";
import { Card } from "@/components/ui/card";
import { PenTool } from "lucide-react";

export function TelestrationHighlight() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="grid items-center gap-8 sm:grid-cols-2">
        <Card className="order-2 overflow-hidden p-0 sm:order-1">
          <Image
            src="/telestration-screenshot.jpg"
            alt="Drawing tools for telestrating directly on a game play"
            width={1920}
            height={650}
            className="h-full w-full"
          />
        </Card>
        <div className="order-1 text-left sm:order-2">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wide text-primary">
            <PenTool className="h-3.5 w-3.5" />
            TELESTRATION
          </p>
          <h2 className="mb-3 text-3xl font-extrabold leading-tight sm:text-4xl">Right on the film.</h2>
          <p className="text-muted">
            Draw directly on the video — circles, arrows, and lines in multiple colors and sizes. Every
            drawing is saved per timestamp, so your coaching point and the film it points to never drift apart.
          </p>
        </div>
      </div>
    </div>
  );
}

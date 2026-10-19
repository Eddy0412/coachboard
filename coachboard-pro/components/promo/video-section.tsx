import { Card } from "@/components/ui/card";

// Self-hosted from public/ — swap to a YouTube embed instead by restoring the
// iframe below and setting an ID, if hosting costs or analytics ever call for it.
const PROMO_VIDEO_SRC = "/promo-video.mp4";
const PROMO_VIDEO_POSTER = "/promo-video-poster.jpg";

export function PromoVideo() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6">
      <Card className="overflow-hidden p-0">
        <div className="aspect-video w-full">
          <video
            src={PROMO_VIDEO_SRC}
            poster={PROMO_VIDEO_POSTER}
            controls
            playsInline
            preload="metadata"
            className="h-full w-full"
          >
            Your browser doesn&apos;t support embedded video.
          </video>
        </div>
      </Card>
    </div>
  );
}

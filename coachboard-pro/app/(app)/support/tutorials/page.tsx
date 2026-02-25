"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Play, X } from "lucide-react";

interface Video {
  id: string;
  title: string;
  thumbnail: string;
}

export default function VideoTutorialsPage() {
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ["youtube-tutorials"],
    queryFn: async () => {
      const res = await fetch("/api/youtube");
      if (!res.ok) throw new Error("Failed to fetch videos");
      const data = await res.json();
      return data.videos;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Video Tutorials</h1>
        <p className="text-sm text-muted">
          Step-by-step video walkthroughs to help you get the most out of Coachboard Pro
        </p>
      </div>

      {/* Inline player */}
      {activeVideo && (
        <Card className="relative overflow-hidden p-0">
          <button
            type="button"
            onClick={() => setActiveVideo(null)}
            className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="aspect-video w-full">
            <iframe
              src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&rel=0`}
              title={activeVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
          <div className="px-4 py-3">
            <h2 className="text-lg font-bold">{activeVideo.title}</h2>
          </div>
        </Card>
      )}

      {/* Video grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="aspect-video animate-pulse rounded-xl bg-card" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-card" />
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-4 p-16">
          <p className="text-sm text-muted">No videos found. Check back soon!</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <button
              key={video.id}
              type="button"
              onClick={() => setActiveVideo(video)}
              className="group flex flex-col gap-2 text-left"
            >
              <div className="relative aspect-video overflow-hidden rounded-xl border border-border">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                  <div className="rounded-full bg-black/60 p-3 opacity-0 transition-opacity group-hover:opacity-100">
                    <Play className="h-6 w-6 text-white" fill="white" />
                  </div>
                </div>
              </div>
              <h3 className="line-clamp-2 text-sm font-medium group-hover:text-primary transition-colors">
                {video.title}
              </h3>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useYouTubePlayer } from "@/hooks/use-youtube";
import { useWorkspaceStore } from "@/stores/workspace";

interface VideoPlayerProps {
  videoId: string;
}

export function VideoPlayer({ videoId }: VideoPlayerProps) {
  const { initPlayer, loadVideo } = useYouTubePlayer("yt-player");
  const initializedRef = useRef(false);
  const { playerReady } = useWorkspaceStore();

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      initPlayer(videoId || undefined);
    }
  }, [initPlayer, videoId]);

  useEffect(() => {
    if (playerReady && videoId) {
      loadVideo(videoId);
    }
  }, [playerReady, videoId, loadVideo]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black">
      <div id="yt-player" className="absolute inset-0" />
    </div>
  );
}

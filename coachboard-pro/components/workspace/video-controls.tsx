"use client";

import { useYouTubePlayer } from "@/hooks/use-youtube";
import { useWorkspaceStore } from "@/stores/workspace";
import { formatTime } from "@/lib/youtube";
import { DEFAULT_STEP_SECONDS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Timer,
} from "lucide-react";

interface VideoControlsProps {
  onAddTimestamp: () => void;
  canEdit: boolean;
}

export function VideoControls({ onAddTimestamp, canEdit }: VideoControlsProps) {
  const { play, pause, seekTo, getCurrentTime, toggleMute } =
    useYouTubePlayer("yt-player");
  const { currentTime, status } = useWorkspaceStore();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="default"
          size="icon"
          onClick={play}
          title="Play"
        >
          <Play className="h-5 w-5" />
        </Button>
        <Button
          variant="default"
          size="icon"
          onClick={pause}
          title="Pause"
        >
          <Pause className="h-5 w-5" />
        </Button>
        <Button
          variant="default"
          size="icon"
          onClick={toggleMute}
          title="Toggle mute"
        >
          <Volume2 className="h-5 w-5" />
        </Button>
        <Button
          variant="default"
          size="icon"
          onClick={() => seekTo(getCurrentTime() - DEFAULT_STEP_SECONDS)}
          title={`Back ${DEFAULT_STEP_SECONDS}s`}
        >
          <SkipBack className="h-5 w-5" />
        </Button>
        <Button
          variant="default"
          size="icon"
          onClick={() => seekTo(getCurrentTime() + DEFAULT_STEP_SECONDS)}
          title={`Forward ${DEFAULT_STEP_SECONDS}s`}
        >
          <SkipForward className="h-5 w-5" />
        </Button>
        {canEdit && (
          <Button variant="primary" onClick={onAddTimestamp}>
            <Timer className="h-4 w-4" />
            Timestamp @ {formatTime(currentTime)}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        <span>Current: {formatTime(currentTime)}</span>
        <span>|</span>
        <span>{status}</span>
      </div>
    </div>
  );
}

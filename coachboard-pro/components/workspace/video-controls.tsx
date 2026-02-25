"use client";

import { useState } from "react";
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
  Gauge,
} from "lucide-react";

const SPEEDS = [0.25, 0.5, 1, 1.5, 2];

interface VideoControlsProps {
  onAddTimestamp: () => void;
  canEdit: boolean;
}

export function VideoControls({ onAddTimestamp, canEdit }: VideoControlsProps) {
  const { play, pause, seekTo, getCurrentTime, toggleMute, setPlaybackRate } =
    useYouTubePlayer("yt-player");
  const { currentTime, status } = useWorkspaceStore();
  const [activeRate, setActiveRate] = useState(1);

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    setActiveRate(rate);
  };

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

        <div className="flex items-center gap-1 ml-1">
          <Gauge className="h-3.5 w-3.5 text-muted" />
          {SPEEDS.map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => handleSpeedChange(rate)}
              title={`${rate}x speed`}
              className={`px-1 py-0.5 text-[11px] rounded transition-colors ${
                activeRate === rate
                  ? "text-primary font-semibold"
                  : "text-muted hover:text-text"
              }`}
            >
              {rate === 1 ? "1x" : `${rate}x`}
            </button>
          ))}
        </div>

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

"use client";

import { useWorkspaceStore } from "@/stores/workspace";
import { Button } from "@/components/ui/button";
import { useUpdateTimestamp } from "@/hooks/use-timestamps";
import { useYouTubePlayer } from "@/hooks/use-youtube";
import type { Timestamp } from "@/lib/supabase/types";

interface OverlayControllerProps {
  timestamp: Timestamp | null;
  canEdit: boolean;
}

export function OverlayController({ timestamp, canEdit }: OverlayControllerProps) {
  const updateTimestamp = useUpdateTimestamp();
  const { getCurrentTime } = useYouTubePlayer("yt-player");
  const { setStatus } = useWorkspaceStore();

  if (!timestamp || !canEdit) return null;

  const applyDuration = (sec: number) => {
    updateTimestamp.mutate({
      id: timestamp.id,
      overlay_show_sec: sec,
    });
    setStatus(`Drawing overlay set to ${sec}s`);
  };

  const setEndTime = () => {
    const t = Math.floor(getCurrentTime());
    if (t <= timestamp.time_seconds) {
      updateTimestamp.mutate({ id: timestamp.id, end_time_seconds: null });
      setStatus("End cleared (must be after start).");
      return;
    }
    updateTimestamp.mutate({ id: timestamp.id, end_time_seconds: t });
    setStatus(`End set to ${t}s`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted">Overlay:</span>
      <Button variant="default" size="sm" onClick={() => applyDuration(5)}>
        5s
      </Button>
      <Button variant="default" size="sm" onClick={() => applyDuration(10)}>
        10s
      </Button>
      <Button variant="default" size="sm" onClick={setEndTime}>
        Set End
      </Button>
    </div>
  );
}

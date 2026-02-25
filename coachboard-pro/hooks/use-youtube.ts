"use client";

import { useEffect, useCallback } from "react";
import { useWorkspaceStore } from "@/stores/workspace";

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

let apiLoaded = false;
let apiReady = false;
const readyCallbacks: (() => void)[] = [];

function loadYouTubeAPI() {
  if (apiLoaded) return;
  apiLoaded = true;
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);

  window.onYouTubeIframeAPIReady = () => {
    apiReady = true;
    readyCallbacks.forEach((cb) => cb());
    readyCallbacks.length = 0;
  };
}

function onAPIReady(cb: () => void) {
  if (apiReady) {
    cb();
  } else {
    readyCallbacks.push(cb);
    loadYouTubeAPI();
  }
}

// Shared player instances keyed by container ID
const players: Record<string, YT.Player | null> = {};
let timeInterval: ReturnType<typeof setInterval> | null = null;

export function useYouTubePlayer(containerId: string) {
  const { setPlayerReady, setCurrentTime, setStatus } = useWorkspaceStore();

  const initPlayer = useCallback(
    (videoId?: string) => {
      onAPIReady(() => {
        if (players[containerId]) {
          players[containerId]!.destroy();
        }

        players[containerId] = new window.YT.Player(containerId, {
          height: "100%",
          width: "100%",
          videoId: videoId || undefined,
          playerVars: {
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            controls: 0,
            disablekb: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              // Mute by default so videos load silently
              players[containerId]?.mute();
              setPlayerReady(true);
              setStatus("Player ready. (muted)");
            },
            onError: (e: YT.OnErrorEvent) => {
              const code = e.data;
              const messages: Record<number, string> = {
                2: "Invalid video ID or parameter.",
                5: "HTML5 player error.",
                100: "Video not found (removed/private).",
                101: "Embed not allowed.",
                150: "Embed not allowed.",
              };
              setStatus(
                `Player error (${code}). ${messages[code] || "Unknown error."}`
              );
            },
          },
        });

        // Time tracking interval (only one globally)
        if (timeInterval) clearInterval(timeInterval);
        timeInterval = setInterval(() => {
          const p = players[containerId];
          if (p && typeof p.getCurrentTime === "function") {
            setCurrentTime(p.getCurrentTime());
          }
        }, 250);
      });
    },
    [containerId, setPlayerReady, setCurrentTime, setStatus]
  );

  const loadVideo = useCallback(
    (videoId: string) => {
      const p = players[containerId];
      if (p && typeof p.cueVideoById === "function") {
        p.cueVideoById(videoId);
      }
    },
    [containerId]
  );

  const play = useCallback(() => {
    players[containerId]?.playVideo();
  }, [containerId]);

  const pause = useCallback(() => {
    players[containerId]?.pauseVideo();
  }, [containerId]);

  const seekTo = useCallback(
    (seconds: number) => {
      players[containerId]?.seekTo(Math.max(0, seconds), true);
    },
    [containerId]
  );

  const getCurrentTime = useCallback(
    () => players[containerId]?.getCurrentTime() ?? 0,
    [containerId]
  );

  const toggleMute = useCallback(() => {
    const p = players[containerId];
    if (!p) return;
    if (p.isMuted()) {
      p.unMute();
    } else {
      p.mute();
    }
  }, [containerId]);

  const setPlaybackRate = useCallback(
    (rate: number) => {
      const p = players[containerId];
      if (p && typeof p.setPlaybackRate === "function") {
        p.setPlaybackRate(rate);
      }
    },
    [containerId]
  );

  const getPlaybackRate = useCallback(
    () => {
      const p = players[containerId];
      if (p && typeof p.getPlaybackRate === "function") {
        return p.getPlaybackRate();
      }
      return 1;
    },
    [containerId]
  );

  useEffect(() => {
    return () => {
      if (timeInterval) {
        clearInterval(timeInterval);
        timeInterval = null;
      }
    };
  }, []);

  return {
    initPlayer,
    loadVideo,
    play,
    pause,
    seekTo,
    getCurrentTime,
    toggleMute,
    setPlaybackRate,
    getPlaybackRate,
  };
}

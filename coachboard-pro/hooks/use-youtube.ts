"use client";

import { useEffect, useRef, useCallback } from "react";
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

export function useYouTubePlayer(containerId: string) {
  const playerRef = useRef<YT.Player | null>(null);
  const { setPlayerReady, setCurrentTime, setStatus } = useWorkspaceStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const initPlayer = useCallback(
    (videoId?: string) => {
      onAPIReady(() => {
        if (playerRef.current) {
          playerRef.current.destroy();
        }

        playerRef.current = new window.YT.Player(containerId, {
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
              setPlayerReady(true);
              setStatus("Player ready.");
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

        // Time tracking interval
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
          if (
            playerRef.current &&
            typeof playerRef.current.getCurrentTime === "function"
          ) {
            setCurrentTime(playerRef.current.getCurrentTime());
          }
        }, 250);
      });
    },
    [containerId, setPlayerReady, setCurrentTime, setStatus]
  );

  const loadVideo = useCallback((videoId: string) => {
    if (playerRef.current && typeof playerRef.current.cueVideoById === "function") {
      playerRef.current.cueVideoById(videoId);
    }
  }, []);

  const play = useCallback(() => playerRef.current?.playVideo(), []);
  const pause = useCallback(() => playerRef.current?.pauseVideo(), []);

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(Math.max(0, seconds), true);
  }, []);

  const getCurrentTime = useCallback(
    () => playerRef.current?.getCurrentTime() ?? 0,
    []
  );

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    if (playerRef.current.isMuted()) {
      playerRef.current.unMute();
    } else {
      playerRef.current.mute();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    playerRef,
    initPlayer,
    loadVideo,
    play,
    pause,
    seekTo,
    getCurrentTime,
    toggleMute,
  };
}

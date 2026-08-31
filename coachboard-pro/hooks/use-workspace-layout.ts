"use client";

import { useState, useEffect } from "react";

export type WorkspaceLayout = "balanced" | "video-focus" | "filmroom";

export function useWorkspaceLayout() {
  const [layout, setLayoutState] = useState<WorkspaceLayout>("balanced");

  useEffect(() => {
    const saved = localStorage.getItem("workspace-layout");
    if (saved === "balanced" || saved === "video-focus" || saved === "filmroom") {
      setLayoutState(saved);
    } else if (window.matchMedia("(max-width: 639px)").matches) {
      // No explicit preference yet — Film Room (video-first, full height) fits
      // a phone screen far better than the desktop-oriented Balanced default.
      setLayoutState("filmroom");
    }
  }, []);

  const setLayout = (l: WorkspaceLayout) => {
    setLayoutState(l);
    localStorage.setItem("workspace-layout", l);
  };

  return { layout, setLayout };
}

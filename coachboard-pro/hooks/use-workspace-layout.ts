"use client";

import { useState, useEffect } from "react";

export type WorkspaceLayout = "balanced" | "video-focus";

export function useWorkspaceLayout() {
  const [layout, setLayoutState] = useState<WorkspaceLayout>("balanced");

  useEffect(() => {
    const saved = localStorage.getItem("workspace-layout");
    if (saved === "balanced" || saved === "video-focus") {
      setLayoutState(saved);
    }
  }, []);

  const setLayout = (l: WorkspaceLayout) => {
    setLayoutState(l);
    localStorage.setItem("workspace-layout", l);
  };

  return { layout, setLayout };
}

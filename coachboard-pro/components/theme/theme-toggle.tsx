"use client";

import { Lightbulb, LightbulbOff } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      aria-pressed={isLight}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-primary hover:text-text"
    >
      {isLight ? (
        <Lightbulb className="h-4 w-4" />
      ) : (
        <LightbulbOff className="h-4 w-4" />
      )}
    </button>
  );
}

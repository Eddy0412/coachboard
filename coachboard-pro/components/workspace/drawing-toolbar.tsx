"use client";

import { useWorkspaceStore } from "@/stores/workspace";
import { useClearDrawings } from "@/hooks/use-drawing";
import { useSubscription } from "@/hooks/use-subscription";
import { DRAW_COLORS, FREE_DRAW_COLORS, DRAW_SIZES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawingToolbarProps {
  canEdit: boolean;
  teamId?: string | null;
}

export function DrawingToolbar({ canEdit, teamId }: DrawingToolbarProps) {
  const {
    drawEnabled,
    toggleDraw,
    selectedColor,
    setSelectedColor,
    selectedSize,
    setSelectedSize,
    selectedTimestampId,
  } = useWorkspaceStore();

  const clearDrawings = useClearDrawings();
  const { isPro } = useSubscription(teamId);

  const colors = isPro ? DRAW_COLORS : FREE_DRAW_COLORS;

  if (!canEdit) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant={drawEnabled ? "primary" : "default"}
        size="sm"
        onClick={toggleDraw}
      >
        <Pencil className="h-3 w-3" />
        Draw {drawEnabled ? "On" : "Off"}
        <span
          className="ml-1 inline-block h-2.5 w-2.5 rounded-full border border-white/25"
          style={{ background: selectedColor }}
        />
      </Button>

      <div className="flex items-center gap-1.5">
        {colors.map((c) => (
          <button
            key={c.hex}
            onClick={() => setSelectedColor(c.hex)}
            title={c.name}
            className={cn(
              "h-4.5 w-4.5 rounded-full border cursor-pointer transition-all",
              selectedColor === c.hex
                ? "border-white/75 outline outline-2 outline-offset-1 outline-white/40"
                : "border-white/20 hover:border-white/50"
            )}
            style={{ background: c.hex }}
          />
        ))}
      </div>

      <div className="relative flex items-center">
        <select
          value={String(selectedSize)}
          onChange={(e) => setSelectedSize(Number(e.target.value))}
          className="h-9 appearance-none cursor-pointer rounded-xl border border-border bg-input pl-3 pr-7 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {DRAW_SIZES.map((s) => (
            <option key={s} value={s}>{s}px</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
      </div>

      <Button
        variant="danger"
        size="sm"
        onClick={() => {
          if (selectedTimestampId) {
            clearDrawings.mutate(selectedTimestampId);
          }
        }}
        disabled={!selectedTimestampId}
      >
        <Trash2 className="h-3 w-3" />
        Clear
      </Button>
    </div>
  );
}

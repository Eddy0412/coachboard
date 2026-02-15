"use client";

import { useWorkspaceStore } from "@/stores/workspace";
import { useClearDrawings } from "@/hooks/use-drawing";
import { useSubscription } from "@/hooks/use-subscription";
import { DRAW_COLORS, FREE_DRAW_COLORS, DRAW_SIZES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawingToolbarProps {
  canEdit: boolean;
}

export function DrawingToolbar({ canEdit }: DrawingToolbarProps) {
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
  const { isPro } = useSubscription();

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

      <Select
        value={String(selectedSize)}
        onChange={(e) => setSelectedSize(Number(e.target.value))}
        className="w-20"
      >
        {DRAW_SIZES.map((s) => (
          <option key={s} value={s}>
            {s}px
          </option>
        ))}
      </Select>

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

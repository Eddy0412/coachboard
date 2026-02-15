"use client";

import { useRef, useEffect, useCallback } from "react";
import { useWorkspaceStore } from "@/stores/workspace";
import { useDrawings, useCreateDrawing } from "@/hooks/use-drawing";
import type { Drawing } from "@/lib/supabase/types";

interface TelestrationCanvasProps {
  timestampId: string | null;
  canEdit: boolean;
}

interface ActiveStroke {
  tool: "pen" | "erase";
  color: string;
  size: number;
  points: { x: number; y: number }[];
}

export function TelestrationCanvas({
  timestampId,
  canEdit,
}: TelestrationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStrokeRef = useRef<ActiveStroke | null>(null);
  const { drawEnabled, selectedColor, selectedSize, overlayVisible } =
    useWorkspaceStore();
  const { data: drawings = [] } = useDrawings(timestampId);
  const createDrawing = useCreateDrawing();

  const drawStroke = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      stroke: { points: { x: number; y: number }[]; tool?: string; color?: string; size?: number },
      canvas: HTMLCanvasElement
    ) => {
      const pts = stroke.points;
      if (pts.length < 2) return;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation =
        stroke.tool === "erase" ? "destination-out" : "source-over";
      ctx.strokeStyle = stroke.color || "#00E5FF";
      ctx.lineWidth = Number(stroke.size || 4);
      ctx.beginPath();
      ctx.moveTo(pts[0].x * canvas.width, pts[0].y * canvas.height);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x * canvas.width, pts[i].y * canvas.height);
      }
      ctx.stroke();
      ctx.restore();
    },
    []
  );

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const d of drawings) {
      drawStroke(ctx, d, canvas);
    }
    if (activeStrokeRef.current) {
      drawStroke(ctx, activeStrokeRef.current, canvas);
    }
  }, [drawings, drawStroke]);

  // Resize canvas to match parent
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = Math.floor(rect.width);
      canvas.height = Math.floor(rect.height);
      redrawAll();
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [redrawAll]);

  // Redraw when drawings change
  useEffect(() => {
    redrawAll();
  }, [redrawAll]);

  const relPoint = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const r = canvas.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(1, (clientX - r.left) / r.width)),
        y: Math.max(0, Math.min(1, (clientY - r.top) / r.height)),
      };
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!drawEnabled || !canEdit || !timestampId) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.setPointerCapture(e.pointerId);
      activeStrokeRef.current = {
        tool: "pen",
        color: selectedColor,
        size: selectedSize,
        points: [relPoint(e.clientX, e.clientY)],
      };
      redrawAll();
    },
    [drawEnabled, canEdit, timestampId, selectedColor, selectedSize, relPoint, redrawAll]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drawEnabled || !activeStrokeRef.current) return;
      activeStrokeRef.current.points.push(relPoint(e.clientX, e.clientY));
      redrawAll();
    },
    [drawEnabled, relPoint, redrawAll]
  );

  const handlePointerUp = useCallback(() => {
    if (!drawEnabled || !activeStrokeRef.current || !timestampId) return;
    const stroke = activeStrokeRef.current;
    activeStrokeRef.current = null;

    if (stroke.points.length >= 2) {
      createDrawing.mutate({
        timestamp_id: timestampId,
        tool: stroke.tool,
        color: stroke.color,
        size: stroke.size,
        points: stroke.points,
        sort_order: drawings.length,
      });
    }
  }, [drawEnabled, timestampId, createDrawing, drawings.length]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 touch-none"
      style={{
        pointerEvents: drawEnabled && canEdit ? "auto" : "none",
        opacity: overlayVisible ? 1 : 0,
        transition: "opacity 0.2s",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}

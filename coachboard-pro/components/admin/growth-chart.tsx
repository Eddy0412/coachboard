"use client";

import { useId, useMemo, useRef, useState } from "react";
import { formatCompact } from "@/lib/utils";

type Point = { date: string; value: number };

const VIEW_W = 600;
const VIEW_H = 180;
const PAD_TOP = 12;
const PAD_BOTTOM = 20;

function formatDayLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Single-series area chart: 2px line, ~10% fill wash, crosshair + tooltip on hover. */
export function GrowthChart({ data, color }: { data: Point[]; color: string }) {
  const gradientId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const plotH = VIEW_H - PAD_TOP - PAD_BOTTOM;
  const stepX = data.length > 1 ? VIEW_W / (data.length - 1) : 0;

  const points = useMemo(
    () =>
      data.map((d, i) => ({
        x: data.length > 1 ? i * stepX : VIEW_W / 2,
        y: PAD_TOP + plotH - (d.value / maxValue) * plotH,
        ...d,
      })),
    [data, stepX, plotH, maxValue]
  );

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${VIEW_H - PAD_BOTTOM} L ${points[0].x.toFixed(2)} ${VIEW_H - PAD_BOTTOM} Z`
      : "";

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!wrapRef.current || points.length === 0) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const idx = Math.round(fraction * (points.length - 1));
    setHoverIndex(idx);
  };

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const tooltipLeftPct = hovered ? (hovered.x / VIEW_W) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      className="relative w-full select-none"
      style={{ height: VIEW_H }}
      onPointerMove={handleMove}
      onPointerLeave={() => setHoverIndex(null)}
    >
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.12} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* baseline */}
        <line
          x1={0}
          y1={VIEW_H - PAD_BOTTOM}
          x2={VIEW_W}
          y2={VIEW_H - PAD_BOTTOM}
          stroke="var(--color-border)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />

        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {hovered && (
          <line
            x1={hovered.x}
            y1={PAD_TOP}
            x2={hovered.x}
            y2={VIEW_H - PAD_BOTTOM}
            stroke="var(--color-border)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* endpoint marker, always visible */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r={4}
            fill={color}
            stroke="var(--color-card)"
            strokeWidth={2}
          />
        )}
        {hovered && (
          <circle cx={hovered.x} cy={hovered.y} r={4} fill={color} stroke="var(--color-card)" strokeWidth={2} />
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: `${tooltipLeftPct}%` }}
        >
          <div className="font-semibold tabular-nums text-text">{formatCompact(hovered.value)}</div>
          <div className="text-muted">{formatDayLabel(hovered.date)}</div>
        </div>
      )}
    </div>
  );
}

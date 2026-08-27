"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Download,
  Lock,
  Maximize2,
  RefreshCw,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { Timestamp } from "@/lib/supabase/types";
import { PASS_TARGET_MAX_DEPTH_YDS, PASS_TARGET_YARD_TICKS, PASS_TARGET_LOS_Y } from "@/lib/constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Visibility = "coach_only" | "team";

interface CoachIQProps {
  timestamps: Timestamp[];
  projectId: string;
  teamId?: string | null;
  canEdit: boolean;
  initialReport?: string | null;
  initialVisibility?: Visibility;
  initialGeneratedAt?: string | null;
  onSave?: (report: string, visibility: Visibility) => Promise<void>;
}

const PASS_HEATMAP_COLS = 3; // matches Left/Middle/Right hash lanes used elsewhere
const PASS_HEATMAP_ROWS = 4; // 3 downfield bands (Deep/Mid/Short) + 1 behind-LOS band
const MIN_PASS_TARGETS = 3;

function heatColorRgb(pct: number): [number, number, number] {
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  const low: [number, number, number] = [34, 197, 94]; // --color-success (green) — low %
  const mid: [number, number, number] = [249, 115, 22]; // orange — mid %
  const high: [number, number, number] = [255, 77, 77]; // --color-danger (red) — high %
  const a = pct <= 50 ? low : mid;
  const b = pct <= 50 ? mid : high;
  const t = pct <= 50 ? pct / 50 : (pct - 50) / 50;
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function heatColor(pct: number) {
  const [r, g, b] = heatColorRgb(pct);
  return `rgb(${r}, ${g}, ${b})`;
}

type HeatCell = { count: number; freqPct: number; resultCount: number; completionPct: number | null };

/** Color relative to this dataset's actual min/max, not an absolute 0–100% scale. With
 * realistic sample sizes a single cell rarely nears 100% of all targets, so an absolute scale
 * would leave every cell reading "cold" even though one zone is clearly the most-used. */
function relativeHeatColorFn(cells: HeatCell[][], mode: "frequency" | "completion") {
  const shownPcts: number[] = [];
  for (const row of cells) {
    for (const cell of row) {
      const shown = mode === "frequency" ? cell.count > 0 : cell.resultCount > 0;
      if (shown) shownPcts.push(mode === "frequency" ? cell.freqPct : (cell.completionPct as number));
    }
  }
  const minPct = shownPcts.length ? Math.min(...shownPcts) : 0;
  const maxPct = shownPcts.length ? Math.max(...shownPcts) : 0;
  return (pct: number) => (maxPct === minPct ? heatColor(100) : heatColor(((pct - minPct) / (maxPct - minPct)) * 100));
}

/** Same density-field math as ZoneHeatmap below, but computed and rasterized to a data URI
 * synchronously in one function call — no refs, no effect, no measurement. Canvas drawing is
 * normally async (a useEffect after mount/paint), which is fine on screen but unsafe for print:
 * there's no guarantee the draw completes before the browser snapshots the page. This has no
 * such gap — the pixels are already baked into the returned string. Used for the PDF export only;
 * the interactive on-screen view uses the ResizeObserver-driven canvas since it needs to track a
 * responsive container size, which this deliberately sidesteps by taking fixed dimensions. */
function renderDensityDataUri(points: { x: number; y: number }[], width: number, height: number): string | null {
  if (points.length === 0 || typeof document === "undefined") return null;

  const gridW = 70;
  const gridH = Math.max(8, Math.round(gridW * (height / width)));
  const sigma = Math.min(width, height) * 0.14;
  const sigma2 = 2 * sigma * sigma;

  const px = points.map((p) => p.x * width);
  const py = points.map((p) => p.y * height);

  const field = new Float32Array(gridW * gridH);
  let maxD = 0;
  for (let gy = 0; gy < gridH; gy++) {
    const sy = ((gy + 0.5) / gridH) * height;
    for (let gx = 0; gx < gridW; gx++) {
      const sx = ((gx + 0.5) / gridW) * width;
      let d = 0;
      for (let k = 0; k < px.length; k++) {
        const dx = sx - px[k];
        const dy = sy - py[k];
        d += Math.exp(-(dx * dx + dy * dy) / sigma2);
      }
      field[gy * gridW + gx] = d;
      if (d > maxD) maxD = d;
    }
  }
  if (maxD <= 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = gridW;
  canvas.height = gridH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const img = ctx.createImageData(gridW, gridH);
  for (let i = 0; i < field.length; i++) {
    const t = field[i] / maxD;
    if (t < 0.03) continue;
    const [r, g, b] = heatColorRgb(t * 100);
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = Math.round((0.35 + 0.65 * t) * 235);
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}

/** Smooth density "zone" heatmap — a Gaussian-kernel density estimate over a coarse grid,
 * computed in JS floating point (not canvas alpha compositing, which clips at 255 and washes
 * out into one uniform blob the moment 2-3 points overlap), then colorized by density relative
 * to this dataset's true peak using the same low/mid/high scale as the grid view. */
function ZoneHeatmap({ points }: { points: { x: number; y: number }[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const draw = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      const ctx = canvas.getContext("2d");
      // Bail if the container has no real size yet — e.g. it's inside a display:none
      // ancestor (the print-only export area, until the moment printing actually starts).
      // The ResizeObserver below re-fires this once it gets real dimensions.
      if (!ctx || !width || !height) return;
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      if (points.length === 0) return;

      const gridW = 70;
      const gridH = Math.max(8, Math.round(gridW * (height / width)));
      // Kernel width in pixels — smaller = tighter, more localized zones ("more precise").
      const sigma = Math.min(width, height) * 0.14;
      const sigma2 = 2 * sigma * sigma;

      const px = points.map((p) => p.x * width);
      const py = points.map((p) => p.y * height);

      const field = new Float32Array(gridW * gridH);
      let maxD = 0;
      for (let gy = 0; gy < gridH; gy++) {
        const sy = ((gy + 0.5) / gridH) * height;
        for (let gx = 0; gx < gridW; gx++) {
          const sx = ((gx + 0.5) / gridW) * width;
          let d = 0;
          for (let k = 0; k < px.length; k++) {
            const dx = sx - px[k];
            const dy = sy - py[k];
            d += Math.exp(-(dx * dx + dy * dy) / sigma2);
          }
          field[gy * gridW + gx] = d;
          if (d > maxD) maxD = d;
        }
      }
      if (maxD <= 0) return;

      const img = ctx.createImageData(gridW, gridH);
      for (let i = 0; i < field.length; i++) {
        const t = field[i] / maxD;
        if (t < 0.03) continue; // fully transparent — no meaningful density here
        const [r, g, b] = heatColorRgb(t * 100);
        img.data[i * 4] = r;
        img.data[i * 4 + 1] = g;
        img.data[i * 4 + 2] = b;
        img.data[i * 4 + 3] = Math.round((0.35 + 0.65 * t) * 235);
      }

      const low = document.createElement("canvas");
      low.width = gridW;
      low.height = gridH;
      const lctx = low.getContext("2d");
      if (!lctx) return;
      lctx.putImageData(img, 0, 0);

      ctx.filter = "blur(4px)";
      ctx.drawImage(low, 0, 0, width, height);
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(container);
    return () => ro.disconnect();
  }, [points]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} />
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CoachIQ({
  timestamps,
  projectId,
  teamId,
  canEdit,
  initialReport,
  initialVisibility = "coach_only",
  initialGeneratedAt,
  onSave,
}: CoachIQProps) {
  const { isPro } = useSubscription(teamId);
  const passTargets = timestamps.filter(
    (t) => t.action === "Pass" && t.target_x != null && t.target_y != null
  );
  const hasHeatmap = passTargets.length >= MIN_PASS_TARGETS;

  const [report, setReport] = useState(initialReport ?? "");
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(!!initialReport || hasHeatmap);
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<"frequency" | "completion">("frequency");
  const [heatmapView, setHeatmapView] = useState<"grid" | "zone">("grid");
  const [showResultColors, setShowResultColors] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const MIN_TAGGED = 20;
  const taggedCount = timestamps.filter((t) => t.odk || t.action).length;
  const hasEnough = taggedCount >= MIN_TAGGED;

  const resultTaggedCount = passTargets.filter((t) => t.pass_result != null).length;
  const hasCompletionData = resultTaggedCount >= MIN_PASS_TARGETS;

  const heatmapCells = useMemo(() => {
    type Cell = { count: number; resultCount: number; completeCount: number };
    const cells: Cell[][] = Array.from({ length: PASS_HEATMAP_ROWS }, () =>
      Array.from({ length: PASS_HEATMAP_COLS }, () => ({ count: 0, resultCount: 0, completeCount: 0 }))
    );
    for (const t of passTargets) {
      const cx = Math.min(PASS_HEATMAP_COLS - 1, Math.floor((t.target_x as number) * PASS_HEATMAP_COLS));
      const cy = Math.min(PASS_HEATMAP_ROWS - 1, Math.floor((t.target_y as number) * PASS_HEATMAP_ROWS));
      const cell = cells[cy][cx];
      cell.count++;
      if (t.pass_result != null) {
        cell.resultCount++;
        if (t.pass_result === "complete") cell.completeCount++;
      }
    }
    const total = passTargets.length;
    return cells.map((row) =>
      row.map(({ count, resultCount, completeCount }) => ({
        count,
        freqPct: total > 0 ? Math.round((count / total) * 100) : 0,
        resultCount,
        completionPct: resultCount > 0 ? Math.round((completeCount / resultCount) * 100) : null,
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passTargets.length, timestamps]);
  // Pulse when coach has 20+ tagged plays and no report yet
  const shouldPulse = canEdit && isPro && hasEnough && !report && !loading;

  // Athletes: show report only if visibility is "team"
  if (!canEdit) {
    if (!report || visibility === "coach_only") return null;
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-text">CoachIQ Report</span>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="ml-auto flex items-center gap-1 text-xs text-muted hover:text-text transition-colors"
          >
            {expanded ? (
              <><ChevronUp className="h-3.5 w-3.5" /> Hide</>
            ) : (
              <><ChevronDown className="h-3.5 w-3.5" /> Show</>
            )}
          </button>
        </div>
        {expanded && (
          <div className="rounded-xl border border-border bg-input/30 p-4 text-sm flex-1 overflow-y-auto min-h-0">
            <pre className="whitespace-pre-wrap font-sans leading-relaxed text-text">{report}</pre>
          </div>
        )}
      </div>
    );
  }

  // Non-pro coaches: locked pill
  if (!isPro) {
    return (
      <Link href="/settings/billing" className="block">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-input/50 px-3 py-2 text-xs text-muted hover:border-primary-br transition-colors">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="font-bold text-text">CoachIQ</span> — AI scouting report · Unlock with Pro
          </span>
        </div>
      </Link>
    );
  }

  const analyze = async () => {
    setConfirming(false);
    setLoading(true);
    setReport("");
    setError("");
    setExpanded(true);

    try {
      const res = await fetch("/api/coachiq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamps, projectId }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setError(`Analysis failed (${res.status})${text ? `: ${text}` : ". Check server logs."}`);
        setLoading(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setReport(result);
      }

      if (result && onSave) {
        setSaving(true);
        const now = new Date().toISOString();
        setGeneratedAt(now);
        await onSave(result, visibility).catch(() => {});
        setSaving(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = () => {
    // Print via a dedicated popup that starts with nothing else in it, rather than trying to
    // hide the rest of the workspace (video, sidebar, timestamp list) on the current page and
    // print that. The hide-everything-else approach kept producing extra blank pages — the CSS
    // itself was verified correct under DevTools' print-media emulation, but window.print() in
    // real use doesn't reliably wait for a big display:none change to finish landing before it
    // snapshots the page for pagination. A window with nothing to hide has nothing to race.
    const popup = window.open("", "_blank", "width=900,height=1150");
    if (!popup) {
      setError("Your browser blocked the export pop-up. Please allow pop-ups for this site and try again.");
      return;
    }
    popup.document.title = "CoachIQ Scout Report";
    const style = popup.document.createElement("style");
    style.textContent = `
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { margin: 0; padding: 28px; background: #ffffff; color: #111111; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
      h1 { font-size: 20px; font-weight: 800; margin: 0; }
      h2 { font-size: 14px; font-weight: 700; margin: 0 0 8px; }
      p { margin: 0; }
      pre { white-space: pre-wrap; font-family: inherit; font-size: 12.5px; line-height: 1.6; margin: 0; }
    `;
    popup.document.head.appendChild(style);

    const rootEl = popup.document.createElement("div");
    popup.document.body.appendChild(rootEl);
    const root = createRoot(rootEl);
    root.render(
      <div>
        <h1>CoachIQ Scout Report</h1>
        {generatedAt && (
          <p style={{ fontSize: 12, color: "#555555", marginTop: 4, marginBottom: 20 }}>
            Generated {formatDate(generatedAt)}
          </p>
        )}
        {hasHeatmap && (
          <div style={{ marginBottom: 24 }}>
            <h2>
              Pass Target Heatmap —{" "}
              {heatmapView === "zone" ? "Zone" : heatmapMode === "frequency" ? "Frequency" : "Completion %"}
            </h2>
            {renderPrintHeatmap(260)}
            {heatmapView === "zone" && (
              <div
                style={{
                  display: "flex",
                  overflow: "hidden",
                  borderRadius: 6,
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginTop: 8,
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                {[0, 33, 66, 100].map((pct, i) => (
                  <span
                    key={i}
                    style={{ flex: 1, padding: "3px 0", textAlign: "center", color: "#ffffff", backgroundColor: heatColor(pct) }}
                  >
                    {["Low", "Med-Low", "Med-High", "High"][i]}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        {report && (
          <div>
            <h2>Report</h2>
            <pre>{report}</pre>
          </div>
        )}
      </div>
    );

    popup.onafterprint = () => {
      root.unmount();
      popup.close();
    };
    // Give the popup a paint cycle to lay out the freshly-rendered content before printing.
    setTimeout(() => {
      popup.focus();
      popup.print();
    }, 150);
  };

  const handleVisibilityChange = async (v: Visibility) => {
    setVisibility(v);
    if (report && onSave) {
      setSaving(true);
      await onSave(report, v).catch(() => {});
      setSaving(false);
    }
  };

  const renderHeatmap = (heightPx: number) => {
    const relativeColor = relativeHeatColorFn(heatmapCells, heatmapMode);

    return (
      <div
        className="relative w-full shrink-0 overflow-hidden rounded-lg border border-border"
        style={{
          height: heightPx,
          backgroundImage:
            "repeating-linear-gradient(180deg, #1E4430 0px, #1E4430 14px, #234E37 14px, #234E37 28px)",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {heatmapView === "grid" ? (
          /* Frequency / completion cells */
          <div
            className="absolute inset-0 grid"
            style={{
              gridTemplateColumns: `repeat(${PASS_HEATMAP_COLS}, 1fr)`,
              gridTemplateRows: `repeat(${PASS_HEATMAP_ROWS}, 1fr)`,
            }}
          >
            {heatmapCells.flatMap((row, ry) =>
              row.map(({ count, freqPct, resultCount, completionPct }, rx) => {
                const shown = heatmapMode === "frequency" ? count > 0 : resultCount > 0;
                const pct = heatmapMode === "frequency" ? freqPct : (completionPct as number);
                return (
                  <div
                    key={`${ry}-${rx}`}
                    className="flex items-end justify-end border-y border-white/10 p-1"
                    style={{
                      backgroundColor: shown ? relativeColor(pct) : "rgba(148, 163, 184, 0.1)",
                      opacity: shown ? 0.82 : 1,
                    }}
                  >
                    {shown && (
                      <span
                        className="text-[10px] font-medium text-white/90"
                        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}
                      >
                        {pct}%
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Zone view — smooth density blob of all tagged pass targets */
          <ZoneHeatmap points={passTargets.map((t) => ({ x: t.target_x as number, y: t.target_y as number }))} />
        )}

      {/* Hashmark-style dashed lane dividers */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: PASS_HEATMAP_COLS - 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute inset-y-0 border-l border-dashed border-white/35"
            style={{ left: `${((i + 1) / PASS_HEATMAP_COLS) * 100}%` }}
          />
        ))}
      </div>

      {/* Yard reference lines — measured from the LOS line, not the box edge */}
      <div className="pointer-events-none absolute inset-0">
        {PASS_TARGET_YARD_TICKS.map((yd) => {
          const topPct = PASS_TARGET_LOS_Y * (1 - yd / PASS_TARGET_MAX_DEPTH_YDS) * 100;
          return (
            <div key={yd} className="absolute inset-x-0 border-t border-dashed border-white/20" style={{ top: `${topPct}%` }}>
              <span
                className="absolute left-1.5 text-[8px] font-bold text-white/35"
                style={{ top: 0, transform: "translateY(-50%)", textShadow: "0 1px 1px rgba(0,0,0,0.35)" }}
              >
                {yd}
              </span>
              <span
                className="absolute right-1.5 text-[8px] font-bold text-white/35"
                style={{ top: 0, transform: "translateY(-50%)", textShadow: "0 1px 1px rgba(0,0,0,0.35)" }}
              >
                {yd}
              </span>
            </div>
          );
        })}
      </div>

      {/* LOS line — the band below it is behind-the-line targets (screens/shovels) */}
      <div
        className="pointer-events-none absolute inset-x-0 border-t-2 border-white/60"
        style={{ top: `${PASS_TARGET_LOS_Y * 100}%` }}
      >
        <span
          className="absolute left-1.5 text-[9px] font-semibold uppercase tracking-wide text-white/90"
          style={{ top: 0, transform: "translateY(-50%)", textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}
        >
          LOS
        </span>
      </div>

      {/* Depth reference labels */}
      <span className="pointer-events-none absolute top-1 left-1.5 text-[9px] font-medium uppercase tracking-wide text-white/70">
        Deep
      </span>
      <span className="pointer-events-none absolute bottom-1 left-1.5 text-[8px] font-medium uppercase tracking-wide text-white/70">
        Behind LOS
      </span>

      {/* Raw tagged points, overlaid on the bucketed grid — colored by result when tagged */}
      <div className="pointer-events-none absolute inset-0">
        {passTargets.map((t) => (
          <div
            key={t.id}
            className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/40"
            style={{
              left: `${(t.target_x as number) * 100}%`,
              top: `${(t.target_y as number) * 100}%`,
              backgroundColor: !showResultColors
                ? "rgba(255,255,255,0.9)"
                : t.pass_result === "complete"
                  ? "#22c55e"
                  : t.pass_result === "interception"
                    ? "#ff4d4d"
                    : t.pass_result === "incomplete"
                      ? "#94a3b8"
                      : "rgba(255,255,255,0.9)",
              boxShadow: "0 0 0 1.5px rgba(255,255,255,0.25)",
            }}
          />
        ))}
      </div>
    </div>
    );
  };

  /** Print-only heatmap. The PDF export renders into a separate popup document that has none
   * of the app's Tailwind stylesheet loaded — only inline `style` props actually work there, so
   * this is a parallel version of renderHeatmap built entirely from inline styles instead of
   * className, rather than trying to make one function serve both. */
  const renderPrintHeatmap = (heightPx: number) => {
    const relativeColor = relativeHeatColorFn(heatmapCells, heatmapMode);
    const cols = PASS_HEATMAP_COLS;
    const rows = PASS_HEATMAP_ROWS;

    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: heightPx,
          overflow: "hidden",
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          backgroundImage: "repeating-linear-gradient(180deg, #1E4430 0px, #1E4430 14px, #234E37 14px, #234E37 28px)",
          // Browsers strip background-color/background-image from print output by default
          // (the "Background graphics" print-dialog checkbox) — this forces it regardless.
          // Inherited, so it also covers the grid cells' backgroundColor below.
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {heatmapView === "grid" ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
            }}
          >
            {heatmapCells.flatMap((row, ry) =>
              row.map(({ count, freqPct, resultCount, completionPct }, rx) => {
                const shown = heatmapMode === "frequency" ? count > 0 : resultCount > 0;
                const pct = heatmapMode === "frequency" ? freqPct : (completionPct as number);
                return (
                  <div
                    key={`${ry}-${rx}`}
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "flex-end",
                      padding: 4,
                      borderTop: "1px solid rgba(255,255,255,0.1)",
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                      backgroundColor: shown ? relativeColor(pct) : "rgba(148, 163, 184, 0.1)",
                      opacity: shown ? 0.82 : 1,
                    }}
                  >
                    {shown && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.9)", textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}>
                        {pct}%
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          (() => {
            const uri = renderDensityDataUri(
              passTargets.map((t) => ({ x: t.target_x as number, y: t.target_y as number })),
              650,
              heightPx
            );
            return uri ? (
              <img
                src={uri}
                alt="Pass target density"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", filter: "blur(3px)" }}
              />
            ) : null;
          })()
        )}

        {/* Hashmark-style dashed lane dividers */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {Array.from({ length: cols - 1 }).map((_, i) => (
            <div
              key={i}
              style={{ position: "absolute", top: 0, bottom: 0, left: `${((i + 1) / cols) * 100}%`, borderLeft: "1px dashed rgba(255,255,255,0.35)" }}
            />
          ))}
        </div>

        {/* Yard reference lines */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {PASS_TARGET_YARD_TICKS.map((yd) => {
            const topPct = PASS_TARGET_LOS_Y * (1 - yd / PASS_TARGET_MAX_DEPTH_YDS) * 100;
            return (
              <div key={yd} style={{ position: "absolute", left: 0, right: 0, top: `${topPct}%`, borderTop: "1px dashed rgba(255,255,255,0.2)" }}>
                <span style={{ position: "absolute", left: 6, top: 0, transform: "translateY(-50%)", fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.35)", textShadow: "0 1px 1px rgba(0,0,0,0.35)" }}>
                  {yd}
                </span>
                <span style={{ position: "absolute", right: 6, top: 0, transform: "translateY(-50%)", fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.35)", textShadow: "0 1px 1px rgba(0,0,0,0.35)" }}>
                  {yd}
                </span>
              </div>
            );
          })}
        </div>

        {/* LOS line */}
        <div style={{ position: "absolute", left: 0, right: 0, top: `${PASS_TARGET_LOS_Y * 100}%`, borderTop: "2px solid rgba(255,255,255,0.6)", pointerEvents: "none" }}>
          <span style={{ position: "absolute", left: 6, top: 0, transform: "translateY(-50%)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,0.9)", textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}>
            LOS
          </span>
        </div>

        {/* Depth reference labels */}
        <span style={{ position: "absolute", top: 4, left: 6, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,0.7)", pointerEvents: "none" }}>
          Deep
        </span>
        <span style={{ position: "absolute", bottom: 4, left: 6, fontSize: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,0.7)", pointerEvents: "none" }}>
          Behind LOS
        </span>

        {/* Raw tagged points */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {passTargets.map((t) => (
            <div
              key={t.id}
              style={{
                position: "absolute",
                width: 8,
                height: 8,
                borderRadius: "50%",
                border: "1px solid rgba(0,0,0,0.4)",
                transform: "translate(-50%, -50%)",
                left: `${(t.target_x as number) * 100}%`,
                top: `${(t.target_y as number) * 100}%`,
                backgroundColor: !showResultColors
                  ? "rgba(255,255,255,0.9)"
                  : t.pass_result === "complete"
                    ? "#22c55e"
                    : t.pass_result === "interception"
                      ? "#ff4d4d"
                      : t.pass_result === "incomplete"
                        ? "#94a3b8"
                        : "rgba(255,255,255,0.9)",
                boxShadow: "0 0 0 1.5px rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderHeatmapSection = (heightPx: number) =>
    hasHeatmap && (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text">Pass Target Heatmap</span>
          <span className="text-xs text-muted">{passTargets.length} tagged</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-border overflow-hidden text-[11px]">
            <button
              type="button"
              onClick={() => setHeatmapView("grid")}
              className={cn(
                "px-2 py-0.5 transition-colors",
                heatmapView === "grid"
                  ? "bg-primary text-white"
                  : "bg-input hover:bg-input/80 text-muted"
              )}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setHeatmapView("zone")}
              className={cn(
                "px-2 py-0.5 transition-colors",
                heatmapView === "zone"
                  ? "bg-primary text-white"
                  : "bg-input hover:bg-input/80 text-muted"
              )}
            >
              Zone
            </button>
          </div>
          {heatmapView === "grid" && (
            <div className="flex rounded-lg border border-border overflow-hidden text-[11px]">
              <button
                type="button"
                onClick={() => setHeatmapMode("frequency")}
                className={cn(
                  "px-2 py-0.5 transition-colors",
                  heatmapMode === "frequency"
                    ? "bg-primary text-white"
                    : "bg-input hover:bg-input/80 text-muted"
                )}
              >
                Frequency
              </button>
              <button
                type="button"
                onClick={() => hasCompletionData && setHeatmapMode("completion")}
                disabled={!hasCompletionData}
                title={hasCompletionData ? undefined : "Tag Result on at least 3 pass plays to unlock"}
                className={cn(
                  "px-2 py-0.5 transition-colors",
                  heatmapMode === "completion"
                    ? "bg-primary text-white"
                    : hasCompletionData
                      ? "bg-input hover:bg-input/80 text-muted"
                      : "bg-input/50 text-muted/50 cursor-not-allowed"
                )}
              >
                Completion %
              </button>
            </div>
          )}
          {heatmapView === "grid" && !hasCompletionData && (
            <span className="text-[10px] text-muted">
              {resultTaggedCount}/{MIN_PASS_TARGETS} results tagged
            </span>
          )}
          {resultTaggedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowResultColors((v) => !v)}
              aria-pressed={showResultColors}
              className="ml-auto flex items-center gap-1.5 text-[11px] text-muted hover:text-text transition-colors"
            >
              Color by result
              <span
                className={cn(
                  "relative h-4 w-7 shrink-0 rounded-full border transition-colors",
                  showResultColors ? "border-primary-br bg-primary/40" : "border-border bg-input"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 h-2.5 w-2.5 rounded-full transition-transform",
                    showResultColors ? "translate-x-3.5 bg-primary" : "translate-x-0 bg-muted"
                  )}
                />
              </span>
            </button>
          )}
        </div>
        {renderHeatmap(heightPx)}
        {heatmapView === "zone" && (
          <div className="flex overflow-hidden rounded-md text-[9px] font-semibold uppercase tracking-wide">
            {[0, 33, 66, 100].map((pct, i) => (
              <span
                key={i}
                className="flex-1 py-0.5 text-center text-white"
                style={{ backgroundColor: heatColor(pct) }}
              >
                {["Low", "Med-Low", "Med-High", "High"][i]}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted">left → right</span>
          {showResultColors && resultTaggedCount > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] text-muted">
              <span className="inline-flex items-center gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#22c55e" }} /> comp
              </span>
              <span className="inline-flex items-center gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#94a3b8" }} /> inc
              </span>
              <span className="inline-flex items-center gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#ff4d4d" }} /> int
              </span>
            </span>
          )}
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-2 flex-1 overflow-hidden min-h-0">
      {/* Button row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          {shouldPulse && (
            <span className="absolute inset-0 rounded-lg animate-ping bg-primary opacity-40 pointer-events-none" />
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (report && !confirming) {
                setConfirming(true);
              } else {
                analyze();
              }
            }}
            disabled={loading || !hasEnough}
            className="gap-1.5 relative"
          >
            {loading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <BrainCircuit className="h-3.5 w-3.5" />
            )}
            {loading ? "Analyzing…" : "CoachIQ Analysis"}
          </Button>
        </div>

        {!hasEnough && (
          <span className="text-xs text-muted">
            {taggedCount === 0
              ? "Tag plays with ODK or Action to enable"
              : `${taggedCount}/20 tagged plays — need ${MIN_TAGGED - taggedCount} more`}
          </span>
        )}

        {generatedAt && !loading && !confirming && (
          <span className="text-xs text-muted">Last analyzed: {formatDate(generatedAt)}</span>
        )}
        {saving && <span className="text-xs text-muted">Saving…</span>}

        {(report || hasHeatmap) && !loading && !confirming && (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              title="Expand"
              className="flex items-center gap-1 text-xs text-muted hover:text-text transition-colors"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Expand
            </button>
            {report && (
              <button
                onClick={handleExportPdf}
                title="Export as PDF"
                className="flex items-center gap-1 text-xs text-muted hover:text-text transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Export PDF
              </button>
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted hover:text-text transition-colors"
            >
              {expanded ? (
                <><ChevronUp className="h-3.5 w-3.5" /> Hide</>
              ) : (
                <><ChevronDown className="h-3.5 w-3.5" /> {report ? "Show report" : "Show heatmap"}</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Re-run confirmation */}
      {confirming && (
        <div className="flex items-center gap-2 rounded-lg border border-warning-br bg-warning/10 px-3 py-2 text-xs">
          <span className="text-text flex-1">
            Report from {formatDate(generatedAt)} already exists. Re-run and replace it?
          </span>
          <button
            onClick={analyze}
            className="font-semibold text-warning hover:text-text transition-colors"
          >
            Re-run
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-muted hover:text-text transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Visibility toggle — shown when a report exists */}
      {report && !loading && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Visible to:</span>
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            <button
              onClick={() => handleVisibilityChange("coach_only")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 transition-colors",
                visibility === "coach_only"
                  ? "bg-primary text-white"
                  : "bg-input hover:bg-input/80 text-muted"
              )}
            >
              <UserCheck className="h-3 w-3" /> Coach only
            </button>
            <button
              onClick={() => handleVisibilityChange("team")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 transition-colors",
                visibility === "team"
                  ? "bg-primary text-white"
                  : "bg-input hover:bg-input/80 text-muted"
              )}
            >
              <Users className="h-3 w-3" /> Team
            </button>
          </div>
        </div>
      )}

      {/* Report output */}
      {(report || error || hasHeatmap) && expanded && (
        <div
          className={cn(
            "rounded-xl border p-4 text-sm flex-1 overflow-y-auto min-h-0",
            error
              ? "border-danger-br bg-danger/5 text-danger"
              : "border-border bg-input/30"
          )}
        >
          {hasHeatmap && (
            <div className={cn((report || error) && "mb-4")}>{renderHeatmapSection(110)}</div>
          )}

          {error ? (
            <p>{error}</p>
          ) : report ? (
            <pre className="whitespace-pre-wrap font-sans leading-relaxed text-text">
              {report}
              {loading && (
                <span className="inline-block h-3.5 w-0.5 animate-pulse bg-primary ml-0.5" />
              )}
            </pre>
          ) : null}
        </div>
      )}

      {/* Expanded view — full-viewport modal, unconstrained by the workspace layout's fixed height */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl w-[92vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>CoachIQ Scout Report</DialogTitle>
            {generatedAt && <DialogDescription>Last analyzed: {formatDate(generatedAt)}</DialogDescription>}
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {hasHeatmap && renderHeatmapSection(220)}
            {error ? (
              <p className="text-sm text-danger">{error}</p>
            ) : report ? (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text">{report}</pre>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

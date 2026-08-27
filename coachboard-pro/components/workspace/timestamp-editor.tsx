"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useWorkspaceStore } from "@/stores/workspace";
import { useAutoSaveTimestamp, useDeleteTimestamp, useUpdateTimestamp } from "@/hooks/use-timestamps";
import { formatTime } from "@/lib/youtube";
import {
  ODK_OPTIONS,
  DOWN_OPTIONS,
  HASH_OPTIONS,
  ACTION_OPTIONS,
  PASS_TARGET_MAX_DEPTH_YDS,
  PASS_TARGET_YARD_TICKS,
  PASS_TARGET_LOS_Y,
  PASS_RESULT_OPTIONS,
} from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, MapPin, Clock, Lock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";
import type { Timestamp } from "@/lib/supabase/types";

interface TimestampEditorProps {
  timestamp: Timestamp | null;
  projectId: string;
  canEdit: boolean;
  onSeek: (seconds: number) => void;
  teamId?: string | null;
}

export function TimestampEditor({
  timestamp,
  projectId,
  canEdit,
  onSeek,
  teamId,
}: TimestampEditorProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [distance, setDistance] = useState("");
  const [los, setLos] = useState("");
  const autoSave = useAutoSaveTimestamp();
  const deleteTimestamp = useDeleteTimestamp();
  const updateTimestamp = useUpdateTimestamp();
  const { currentTime, setSelectedTimestamp } = useWorkspaceStore();
  const { isPro, isElite } = useSubscription(teamId);
  const hasGameDetails = isPro || isElite;

  useEffect(() => {
    if (timestamp) {
      setTitle(timestamp.title);
      setDescription(timestamp.description);
      setDistance(timestamp.distance ?? "");
      setLos(timestamp.los ?? "");
    } else {
      setTitle("");
      setDescription("");
      setDistance("");
      setLos("");
    }
  }, [timestamp?.id]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (timestamp && canEdit) {
      autoSave(timestamp.id, { title: val });
    }
  };

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    if (timestamp && canEdit) {
      autoSave(timestamp.id, { description: val });
    }
  };

  const handleDistanceChange = (val: string) => {
    setDistance(val);
    if (timestamp && canEdit) {
      autoSave(timestamp.id, { distance: val || null });
    }
  };

  const handleLosChange = (val: string) => {
    setLos(val);
    if (timestamp && canEdit) {
      autoSave(timestamp.id, { los: val || null });
    }
  };

  const handleToggle = (field: "odk" | "down" | "hash" | "action" | "pass_result", value: string) => {
    if (!timestamp || !canEdit) return;
    const newVal = timestamp[field] === value ? null : value;
    updateTimestamp.mutate({ id: timestamp.id, [field]: newVal });
  };

  const handleTargetClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!timestamp || !canEdit) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    updateTimestamp.mutate({ id: timestamp.id, target_x: x, target_y: y });
  };

  const handleClearTarget = () => {
    if (!timestamp || !canEdit) return;
    updateTimestamp.mutate({ id: timestamp.id, target_x: null, target_y: null });
  };

  const handleDelete = () => {
    if (!timestamp) return;
    deleteTimestamp.mutate({ id: timestamp.id, projectId });
    setSelectedTimestamp(null);
  };

  if (!timestamp) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <p className="text-sm text-muted">Select a timestamp to edit</p>
        <p className="text-xs text-muted">
          Create timestamps from the video controls
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Timestamp Editor</h3>
        <Badge>{formatTime(timestamp.time_seconds)}</Badge>
      </div>

      <Input
        placeholder="Title"
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        disabled={!canEdit}
      />

      <Textarea
        placeholder="Notes / coaching points"
        value={description}
        onChange={(e) => handleDescriptionChange(e.target.value)}
        rows={hasGameDetails ? 3 : 6}
        disabled={!canEdit}
        className={hasGameDetails ? "min-h-[48px]" : undefined}
      />

      {/* Game detail fields — Pro / Elite only */}
      {hasGameDetails ? (
        <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-input/50 p-3">
          {/* ODK */}
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-xs text-muted">ODK</span>
            <div className="flex gap-1">
              {ODK_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleToggle("odk", opt.value)}
                  disabled={!canEdit}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                    timestamp.odk === opt.value
                      ? opt.variant === "success"
                        ? "bg-success/10 border border-success/30 text-success"
                        : opt.variant === "danger"
                          ? "bg-danger/10 border border-danger-br text-danger"
                          : "bg-warning/10 border border-warning/30 text-warning"
                      : "border border-border text-muted hover:text-text",
                    !canEdit && "cursor-default opacity-70"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Down & Distance */}
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-xs text-muted">Down</span>
            <div className="flex gap-1">
              {DOWN_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => handleToggle("down", d)}
                  disabled={!canEdit}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors border",
                    timestamp.down === d
                      ? "bg-primary-bg border-primary-br text-text"
                      : "border-border text-muted hover:text-text",
                    !canEdit && "cursor-default opacity-70"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted">&</span>
            <Input
              placeholder="Yds"
              value={distance}
              onChange={(e) => handleDistanceChange(e.target.value)}
              disabled={!canEdit}
              className="h-7 w-16 text-xs"
            />
          </div>

          {/* LOS */}
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-xs text-muted">LOS</span>
            <Input
              placeholder="e.g. −25 or +40"
              value={los}
              onChange={(e) => handleLosChange(e.target.value)}
              disabled={!canEdit}
              className="h-7 w-28 text-xs"
            />
            <span className="text-[10px] text-muted">− own / + opp</span>
          </div>

          {/* Hash */}
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-xs text-muted">Hash</span>
            <div className="flex gap-1">
              {HASH_OPTIONS.map((h) => (
                <button
                  key={h.value}
                  onClick={() => handleToggle("hash", h.value)}
                  disabled={!canEdit}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors border",
                    timestamp.hash === h.value
                      ? "bg-primary-bg border-primary-br text-text"
                      : "border-border text-muted hover:text-text",
                    !canEdit && "cursor-default opacity-70"
                  )}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action */}
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-xs text-muted">Action</span>
            <div className="flex gap-1">
              {ACTION_OPTIONS.map((a) => (
                <button
                  key={a}
                  onClick={() => handleToggle("action", a)}
                  disabled={!canEdit}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors border",
                    timestamp.action === a
                      ? "bg-primary-bg border-primary-br text-text"
                      : "border-border text-muted hover:text-text",
                    !canEdit && "cursor-default opacity-70"
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Pass Target — click to mark where the ball landed */}
          {timestamp.action === "Pass" && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Pass Target</span>
                {timestamp.target_x != null && canEdit && (
                  <button
                    onClick={handleClearTarget}
                    className="text-[10px] text-muted hover:text-danger transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div
                onClick={canEdit ? handleTargetClick : undefined}
                className={cn(
                  "relative h-24 rounded-lg border border-border bg-input/50 overflow-hidden",
                  canEdit && "cursor-crosshair"
                )}
              >
                <div className="absolute inset-y-0 left-1/3 border-l border-dashed border-muted/40" />
                <div className="absolute inset-y-0 left-2/3 border-l border-dashed border-muted/40" />
                {PASS_TARGET_YARD_TICKS.map((yd) => {
                  const topPct = PASS_TARGET_LOS_Y * (1 - yd / PASS_TARGET_MAX_DEPTH_YDS) * 100;
                  return (
                    <div key={yd} className="absolute inset-x-0 border-t border-dashed border-muted/30" style={{ top: `${topPct}%` }}>
                      <span
                        className="absolute right-1 text-[8px] text-muted"
                        style={{ top: 0, transform: "translateY(-50%)" }}
                      >
                        {yd}
                      </span>
                    </div>
                  );
                })}
                {/* LOS line — space below is the behind-the-line (screen/shovel) zone */}
                <div className="absolute inset-x-0 border-t border-primary/60" style={{ top: `${PASS_TARGET_LOS_Y * 100}%` }}>
                  <span className="absolute left-1.5 text-[8px] font-semibold uppercase tracking-wide text-primary" style={{ top: 0, transform: "translateY(-50%)" }}>
                    LOS
                  </span>
                </div>
                <span className="absolute top-1 left-1.5 text-[9px] uppercase tracking-wide text-muted">Deep</span>
                <span className="absolute bottom-1 left-1.5 text-[8px] uppercase tracking-wide text-muted">Behind LOS</span>
                {timestamp.target_x != null && timestamp.target_y != null && (
                  <div
                    className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 bg-primary"
                    style={{ left: `${timestamp.target_x * 100}%`, top: `${timestamp.target_y * 100}%` }}
                  />
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-xs text-muted">Result</span>
                <div className="flex gap-1">
                  {PASS_RESULT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleToggle("pass_result", opt.value)}
                      disabled={!canEdit}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                        timestamp.pass_result === opt.value
                          ? opt.variant === "success"
                            ? "bg-success/10 border border-success/30 text-success"
                            : opt.variant === "danger"
                              ? "bg-danger/10 border border-danger-br text-danger"
                              : "bg-warning/10 border border-warning/30 text-warning"
                          : "border border-border text-muted hover:text-text",
                        !canEdit && "cursor-default opacity-70"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Link href="/settings/billing" className="block">
          <div className="relative overflow-hidden rounded-xl border border-border bg-input/50 p-3">
            <div className="flex flex-col gap-2.5 opacity-30 pointer-events-none select-none">
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-xs text-muted">ODK</span>
                <div className="flex gap-1">
                  {ODK_OPTIONS.map((opt) => (
                    <span key={opt.value} className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted">{opt.label}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-xs text-muted">Down</span>
                <span className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted">1st</span>
                <span className="text-xs text-muted">&</span>
                <span className="rounded-lg border border-border px-4 py-1 text-xs text-muted">Yds</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-xs text-muted">LOS</span>
                <span className="rounded-lg border border-border px-4 py-1 text-xs text-muted">−25</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-xs text-muted">Hash</span>
                <span className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted">Left</span>
                <span className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted">Middle</span>
                <span className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted">Right</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-xs text-muted">Action</span>
                <span className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted">Run</span>
                <span className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted">Pass</span>
                <span className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted">Kick</span>
                <span className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted">Trick</span>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 rounded-xl border border-primary-br bg-card/90 px-4 py-2">
                <Lock className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-bold text-text">Unlock with Pro</span>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* End time controls */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-input/50 p-2">
        <Clock className="h-3.5 w-3.5 text-muted" />
        <span className="text-xs text-muted">Start: {formatTime(timestamp.time_seconds)}</span>
        <span className="text-xs text-muted">|</span>
        <span className="text-xs text-muted">
          End: {timestamp.end_time_seconds ? formatTime(timestamp.end_time_seconds) : "—"}
        </span>
        {canEdit && (
          <>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                const t = Math.floor(currentTime);
                if (t >= timestamp.time_seconds) {
                  updateTimestamp.mutate({ id: timestamp.id, end_time_seconds: t });
                }
              }}
              title="Set end time to current playback position"
            >
              Set End
            </Button>
            {timestamp.end_time_seconds && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  updateTimestamp.mutate({ id: timestamp.id, end_time_seconds: null });
                }}
                title="Remove end time"
              >
                Clear
              </Button>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => onSeek(timestamp.time_seconds)}
        >
          <MapPin className="h-3 w-3" />
          Jump to start
        </Button>
        {timestamp.end_time_seconds && (
          <Button
            variant="default"
            size="sm"
            onClick={() => onSeek(timestamp.end_time_seconds!)}
          >
            <MapPin className="h-3 w-3" />
            Jump to end
          </Button>
        )}
        {canEdit && (
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={deleteTimestamp.isPending}
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

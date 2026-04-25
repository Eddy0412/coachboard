"use client";

import { useState } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Lock,
  RefreshCw,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { Timestamp } from "@/lib/supabase/types";

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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
  const [report, setReport] = useState(initialReport ?? "");
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(!!initialReport);
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [saving, setSaving] = useState(false);

  const taggedCount = timestamps.filter((t) => t.odk || t.action).length;
  // Pulse when coach has 20+ tagged plays and no report yet
  const shouldPulse = canEdit && isPro && taggedCount >= 20 && !report && !loading;

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
          <div className="rounded-xl border border-border bg-input/30 p-4 text-sm max-h-64 overflow-y-auto">
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

  const handleVisibilityChange = async (v: Visibility) => {
    setVisibility(v);
    if (report && onSave) {
      setSaving(true);
      await onSave(report, v).catch(() => {});
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Button row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          {shouldPulse && (
            <span className="absolute inset-0 rounded-lg animate-ping bg-primary opacity-40 pointer-events-none" />
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={analyze}
            disabled={loading || taggedCount === 0}
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

        {taggedCount === 0 && (
          <span className="text-xs text-muted">Tag plays with ODK or Action to enable</span>
        )}

        {generatedAt && !loading && (
          <span className="text-xs text-muted">Last analyzed: {formatDate(generatedAt)}</span>
        )}
        {saving && <span className="text-xs text-muted">Saving…</span>}

        {report && !loading && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="ml-auto flex items-center gap-1 text-xs text-muted hover:text-text transition-colors"
          >
            {expanded ? (
              <><ChevronUp className="h-3.5 w-3.5" /> Hide</>
            ) : (
              <><ChevronDown className="h-3.5 w-3.5" /> Show report</>
            )}
          </button>
        )}
      </div>

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
      {(report || error) && expanded && (
        <div
          className={cn(
            "rounded-xl border p-4 text-sm max-h-64 overflow-y-auto",
            error
              ? "border-danger-br bg-danger/5 text-danger"
              : "border-border bg-input/30"
          )}
        >
          {error ? (
            <p>{error}</p>
          ) : (
            <pre className="whitespace-pre-wrap font-sans leading-relaxed text-text">
              {report}
              {loading && (
                <span className="inline-block h-3.5 w-0.5 animate-pulse bg-primary ml-0.5" />
              )}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

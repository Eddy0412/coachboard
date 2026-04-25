"use client";

import { useState } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BrainCircuit, ChevronDown, ChevronUp, Lock, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { Timestamp } from "@/lib/supabase/types";

interface CoachIQProps {
  timestamps: Timestamp[];
  projectId: string;
  teamId?: string | null;
}

export function CoachIQ({ timestamps, projectId, teamId }: CoachIQProps) {
  const { isPro } = useSubscription(teamId);
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);

  const taggedCount = timestamps.filter((t) => t.odk || t.action).length;

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
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isPro) {
    return (
      <Link href="/settings/billing" className="block">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-input/50 px-3 py-2 text-xs text-muted hover:border-primary-br transition-colors">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span><span className="font-bold text-text">CoachIQ</span> — AI scouting report · Unlock with Pro</span>
        </div>
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Button row */}
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={analyze}
          disabled={loading || taggedCount === 0}
          className="gap-1.5"
        >
          {loading ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <BrainCircuit className="h-3.5 w-3.5" />
          )}
          {loading ? "Analyzing…" : "CoachIQ Analysis"}
        </Button>

        {taggedCount === 0 && (
          <span className="text-xs text-muted">
            Tag plays with ODK or Action to enable
          </span>
        )}

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

      {/* Report output */}
      {(report || error) && expanded && (
        <div
          className={cn(
            "rounded-xl border p-4 text-sm",
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

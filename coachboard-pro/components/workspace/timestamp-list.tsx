"use client";

import { useState } from "react";
import { formatTime } from "@/lib/youtube";
import { useWorkspaceStore } from "@/stores/workspace";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Timestamp, Athlete, TimestampAthlete } from "@/lib/supabase/types";
import { X } from "lucide-react";

interface TimestampListProps {
  timestamps: Timestamp[];
  athletes: Athlete[];
  timestampAthletes: Record<string, string[]>; // timestampId -> athleteIds[]
  onSelect: (id: string) => void;
  onSeek: (seconds: number) => void;
}

export function TimestampList({
  timestamps,
  athletes,
  timestampAthletes,
  onSelect,
  onSeek,
}: TimestampListProps) {
  const [filter, setFilter] = useState("");
  const { selectedTimestampId } = useWorkspaceStore();

  const norm = (s: string) => s.toLowerCase().trim();

  const filtered = timestamps.filter((ts) => {
    if (!filter) return true;
    const q = norm(filter);
    const taggedIds = timestampAthletes[ts.id] || [];
    const taggedLabels = taggedIds
      .map((id) => athletes.find((a) => a.id === id))
      .filter(Boolean)
      .map((a) => `${a!.first_name} ${a!.last_name} ${a!.position} ${a!.jersey_number}`)
      .join(" ");
    return (
      norm(ts.title).includes(q) ||
      norm(ts.description).includes(q) ||
      norm(taggedLabels).includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Input
          placeholder="Filter timestamps..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {filter && (
          <button
            onClick={() => setFilter("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-auto">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted">
            {timestamps.length === 0
              ? "No timestamps yet. Add one from the video controls."
              : "No matches."}
          </p>
        ) : (
          filtered.map((ts) => {
            const taggedIds = timestampAthletes[ts.id] || [];
            const taggedAthletes = taggedIds
              .map((id) => athletes.find((a) => a.id === id))
              .filter(Boolean) as Athlete[];

            return (
              <button
                key={ts.id}
                onClick={() => {
                  onSelect(ts.id);
                  onSeek(ts.time_seconds);
                }}
                className={cn(
                  "flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors",
                  ts.id === selectedTimestampId
                    ? "border-primary-br bg-primary-bg/30"
                    : "border-border hover:border-primary-br"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">
                    {formatTime(ts.time_seconds)} — {ts.title || "Untitled"}
                  </span>
                  <Badge>{taggedAthletes.length} athletes</Badge>
                </div>
                {ts.description && (
                  <p className="text-xs text-muted line-clamp-2">
                    {ts.description}
                  </p>
                )}
                {taggedAthletes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {taggedAthletes.slice(0, 3).map((a) => (
                      <Badge key={a.id} variant="default">
                        #{a.jersey_number} {a.position} — {a.first_name} {a.last_name}
                      </Badge>
                    ))}
                    {taggedAthletes.length > 3 && (
                      <Badge>+{taggedAthletes.length - 3}</Badge>
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

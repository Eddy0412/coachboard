"use client";

import { useState } from "react";
import { useToggleTimestampAthlete } from "@/hooks/use-timestamps";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Athlete } from "@/lib/supabase/types";

interface AthleteTaggingProps {
  timestampId: string | null;
  athletes: Athlete[];
  taggedAthleteIds: string[];
  canEdit: boolean;
  projectId?: string;
  projectTitle?: string;
  timestampTitle?: string;
  taggedByName?: string;
}

export function AthleteTagging({
  timestampId,
  athletes,
  taggedAthleteIds,
  canEdit,
  projectId,
  projectTitle,
  timestampTitle,
  taggedByName,
}: AthleteTaggingProps) {
  const [search, setSearch] = useState("");
  const toggleTag = useToggleTimestampAthlete();

  const norm = (s: string) => s.toLowerCase().trim();
  const taggedSet = new Set(taggedAthleteIds);

  const filtered = athletes
    .filter((a) => {
      if (!search) return true;
      const q = norm(search);
      return (
        norm(a.first_name).includes(q) ||
        norm(a.last_name).includes(q) ||
        norm(a.position).includes(q) ||
        norm(a.jersey_number).includes(q)
      );
    })
    .slice(0, 30);

  if (!timestampId) {
    return (
      <div className="py-4 text-center text-xs text-muted">
        Select a timestamp to tag athletes
      </div>
    );
  }

  const handleToggle = (athleteId: string, isTagged: boolean) => {
    toggleTag.mutate({
      timestampId: timestampId!,
      athleteId,
      tagged: isTagged,
      projectId,
      projectTitle,
      timestampTitle,
      taggedByName,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold">Tag athletes</h4>
      </div>

      {/* Tagged athletes pills */}
      {taggedAthleteIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {taggedAthleteIds.map((id) => {
            const a = athletes.find((x) => x.id === id);
            if (!a) return null;
            return (
              <Badge
                key={id}
                className={canEdit ? "cursor-pointer" : ""}
                onClick={() => {
                  if (canEdit) handleToggle(id, true);
                }}
                title={canEdit ? "Click to remove" : undefined}
              >
                #{a.jersey_number} {a.position} — {a.first_name} {a.last_name}
              </Badge>
            );
          })}
        </div>
      )}

      {canEdit && (
        <>
          <Input
            placeholder="Search athlete (name / jersey / position)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="max-h-40 overflow-auto rounded-xl border border-border">
            {athletes.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted">
                Roster is empty. Add athletes in the Roster tab.
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted">
                No matches.
              </div>
            ) : (
              filtered.map((a) => {
                const isTagged = taggedSet.has(a.id);
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between border-b border-border p-2.5 last:border-b-0"
                  >
                    <div>
                      <div className="text-sm font-bold">
                        #{a.jersey_number} {a.position} — {a.first_name}{" "}
                        {a.last_name}
                      </div>
                    </div>
                    <Button
                      variant={isTagged ? "default" : "primary"}
                      size="sm"
                      onClick={() => handleToggle(a.id, isTagged)}
                    >
                      {isTagged ? "Tagged" : "Tag"}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

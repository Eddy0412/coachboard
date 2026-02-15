"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";
import { useTimestamps } from "@/hooks/use-timestamps";
import { VideoPlayer } from "@/components/workspace/video-player";
import { TimestampList } from "@/components/workspace/timestamp-list";
import { TimestampEditor } from "@/components/workspace/timestamp-editor";
import { TelestrationCanvas } from "@/components/workspace/telestration-canvas";
import { useWorkspaceStore } from "@/stores/workspace";
import { Card } from "@/components/ui/card";
import type { Project, ShareLink, Athlete } from "@/lib/supabase/types";
import { useQuery } from "@tanstack/react-query";

export default function SharedProjectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();
  const { selectedTimestampId, setSelectedTimestamp } = useWorkspaceStore();

  const { data: shareData, isLoading } = useQuery({
    queryKey: ["share-link", token],
    queryFn: async () => {
      const { data: link, error: linkErr } = await supabase
        .from("share_links")
        .select("*")
        .eq("token", token)
        .single();
      if (linkErr || !link) return null;

      const { data: project, error: projErr } = await supabase
        .from("projects")
        .select("*")
        .eq("id", link.project_id)
        .single();
      if (projErr || !project) return null;

      return { link: link as ShareLink, project: project as Project };
    },
  });

  const project = shareData?.project;
  const { data: timestamps = [] } = useTimestamps(project?.id || "");

  const { data: athletes = [] } = useQuery({
    queryKey: ["athletes", project?.team_id],
    queryFn: async () => {
      if (!project?.team_id) return [];
      const { data } = await supabase
        .from("athletes")
        .select("*")
        .eq("team_id", project.team_id);
      return (data ?? []) as Athlete[];
    },
    enabled: !!project?.team_id,
  });

  const { data: allTimestampAthletes = [] } = useQuery({
    queryKey: ["all-timestamp-athletes", project?.id],
    queryFn: async () => {
      const tsIds = timestamps.map((t) => t.id);
      if (!tsIds.length) return [];
      const { data } = await supabase
        .from("timestamp_athletes")
        .select("*")
        .in("timestamp_id", tsIds);
      return data ?? [];
    },
    enabled: timestamps.length > 0,
  });

  const timestampAthletesMap: Record<string, string[]> = {};
  for (const ta of allTimestampAthletes) {
    if (!timestampAthletesMap[ta.timestamp_id])
      timestampAthletesMap[ta.timestamp_id] = [];
    timestampAthletesMap[ta.timestamp_id].push(ta.athlete_id);
  }

  const selectedTimestamp =
    timestamps.find((t) => t.id === selectedTimestampId) ?? null;

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (!shareData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">
          This share link is invalid or has expired.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold">{project!.title}</h1>
          <p className="text-xs text-muted">Shared read-only view</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_1fr_380px]">
        <Card className="flex flex-col gap-3 xl:max-h-[calc(100vh-120px)] overflow-auto">
          <TimestampList
            timestamps={timestamps}
            athletes={athletes}
            timestampAthletes={timestampAthletesMap}
            onSelect={(id) => setSelectedTimestamp(id)}
            onSeek={() => {}}
          />
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="relative">
            <VideoPlayer videoId={project!.youtube_id} />
            <TelestrationCanvas timestampId={selectedTimestampId} canEdit={false} />
          </div>
        </Card>

        <Card className="flex flex-col gap-4 xl:max-h-[calc(100vh-120px)] overflow-auto">
          <TimestampEditor
            timestamp={selectedTimestamp}
            projectId={project!.id}
            canEdit={false}
            onSeek={() => {}}
          />
        </Card>
      </div>
    </div>
  );
}

"use client";

import React, { use, useEffect, useMemo } from "react";
import { useProject } from "@/hooks/use-project";
import { formatTime } from "@/lib/youtube";
import {
  useTimestamps,
  useCreateTimestamp,
  useTimestampAthletes,
} from "@/hooks/use-timestamps";
import { useWorkspaceStore } from "@/stores/workspace";
import { useYouTubePlayer } from "@/hooks/use-youtube";
import { useAuth } from "@/components/auth/auth-provider";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { isAthlete, canEditProject } from "@/lib/permissions";

import { VideoPlayer } from "@/components/workspace/video-player";
import { TelestrationCanvas } from "@/components/workspace/telestration-canvas";
import { VideoControls } from "@/components/workspace/video-controls";
import { DrawingToolbar } from "@/components/workspace/drawing-toolbar";
import { OverlayController } from "@/components/workspace/overlay-controller";
import { TimestampList } from "@/components/workspace/timestamp-list";
import { TimestampEditor } from "@/components/workspace/timestamp-editor";
import { AthleteTagging } from "@/components/workspace/athlete-tagging";
import { CommentThread } from "@/components/workspace/comment-thread";
import { CoachIQ } from "@/components/workspace/coachiq";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

import type { Athlete, ProjectAccess, TeamMember, TimestampAthlete } from "@/lib/supabase/types";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, profile } = useAuth();
  const supabase = createClient();
  const { selectedTimestampId, setSelectedTimestamp, setStatus, currentTime, setOverlayVisible } =
    useWorkspaceStore();
  const { getCurrentTime, seekTo } = useYouTubePlayer("yt-player");

  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: timestamps = [] } = useTimestamps(id);
  const createTimestamp = useCreateTimestamp();

  // Get user's access level
  const { data: access } = useQuery({
    queryKey: ["project-access", id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("project_access")
        .select("*")
        .eq("project_id", id)
        .eq("user_id", user.id)
        .single();
      return data as ProjectAccess | null;
    },
    enabled: !!user && !!id,
  });

  const { data: teamMember } = useQuery({
    queryKey: ["team-member", project?.team_id, user?.id],
    queryFn: async () => {
      if (!user || !project?.team_id) return null;
      const { data } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_id", project.team_id)
        .eq("user_id", user.id)
        .single();
      return data as TeamMember | null;
    },
    enabled: !!user && !!project?.team_id,
  });

  const canEdit = canEditProject(access ?? null, teamMember ?? null) && !isAthlete(profile);

  // Get athletes for the team
  const { data: athletes = [] } = useQuery({
    queryKey: ["athletes", project?.team_id],
    queryFn: async () => {
      if (!project?.team_id) return [];
      const { data, error } = await supabase
        .from("athletes")
        .select("*")
        .eq("team_id", project.team_id)
        .order("last_name");
      if (error) throw error;
      return data as Athlete[];
    },
    enabled: !!project?.team_id,
  });

  // Get all timestamp athletes for this project's timestamps
  const { data: allTimestampAthletes = [] } = useQuery({
    queryKey: ["all-timestamp-athletes", id],
    queryFn: async () => {
      const tsIds = timestamps.map((t) => t.id);
      if (!tsIds.length) return [];
      const { data, error } = await supabase
        .from("timestamp_athletes")
        .select("*")
        .in("timestamp_id", tsIds);
      if (error) throw error;
      return (data ?? []) as TimestampAthlete[];
    },
    enabled: timestamps.length > 0,
  });

  // Build lookup: timestampId -> athleteIds[]
  const timestampAthletesMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const ta of allTimestampAthletes) {
      if (!map[ta.timestamp_id]) map[ta.timestamp_id] = [];
      map[ta.timestamp_id].push(ta.athlete_id);
    }
    return map;
  }, [allTimestampAthletes]);

  // Find the logged-in user's athlete record (if they are an athlete)
  const athleteRole = isAthlete(profile);
  const myAthleteRecord = useMemo(() => {
    if (!athleteRole || !user) return null;
    return athletes.find((a) => a.user_id === user.id) ?? null;
  }, [athleteRole, athletes, user]);

  // Athletes see timestamps where they are tagged OR where no athletes are tagged
  const visibleTimestamps = useMemo(() => {
    if (!athleteRole || !myAthleteRecord) return timestamps;
    return timestamps.filter((ts) => {
      const taggedIds = timestampAthletesMap[ts.id] || [];
      return taggedIds.length === 0 || taggedIds.includes(myAthleteRecord.id);
    });
  }, [athleteRole, myAthleteRecord, timestamps, timestampAthletesMap]);

  // Get tagged athletes for selected timestamp
  const { data: selectedTimestampAthletes = [] } = useQuery({
    queryKey: ["timestamp_athletes", selectedTimestampId],
    queryFn: async () => {
      if (!selectedTimestampId) return [] as string[];
      const { data, error } = await supabase
        .from("timestamp_athletes")
        .select("athlete_id")
        .eq("timestamp_id", selectedTimestampId);
      if (error) throw error;
      return (data ?? []).map((d: { athlete_id: string }) => d.athlete_id);
    },
    enabled: !!selectedTimestampId,
  });

  const selectedTimestamp =
    timestamps.find((t) => t.id === selectedTimestampId) ?? null;

  // Auto-show/hide overlay and auto-pause at end time
  const { pause } = useYouTubePlayer("yt-player");
  const autoPausedRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!selectedTimestamp) {
      setOverlayVisible(false);
      return;
    }
    const start = selectedTimestamp.time_seconds;
    const duration = selectedTimestamp.overlay_show_sec ?? 1;
    // Overlay (drawing) visibility is always based on overlay_show_sec
    const overlayEnd = start + duration;
    const visible = currentTime >= start && currentTime <= overlayEnd;
    setOverlayVisible(visible);

    // Auto-pause when reaching end time (once per timestamp selection)
    if (selectedTimestamp.end_time_seconds && currentTime >= selectedTimestamp.end_time_seconds) {
      if (autoPausedRef.current !== selectedTimestamp.id) {
        autoPausedRef.current = selectedTimestamp.id;
        pause();
        setStatus(`Auto-paused at ${formatTime(selectedTimestamp.end_time_seconds)}`);
      }
    } else {
      // Reset auto-pause flag when before end time (allows re-pause on replay)
      if (autoPausedRef.current === selectedTimestamp.id && currentTime < start) {
        autoPausedRef.current = null;
      }
    }
  }, [currentTime, selectedTimestamp, setOverlayVisible, pause, setStatus]);

  const handleAddTimestamp = async () => {
    const time = Math.floor(getCurrentTime());
    const ts = await createTimestamp.mutateAsync({
      project_id: id,
      time_seconds: time,
    });
    setSelectedTimestamp(ts.id);
    setStatus(`Added timestamp @ ${time}s`);
  };

  const handleSeek = (seconds: number) => {
    seekTo(seconds);
  };

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-muted">Project not found.</p>
        <Link href="/dashboard">
          <Button>Back to dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold">{project.title}</h1>
          {project.description && (
            <p className="text-sm text-muted">{project.description}</p>
          )}
        </div>
        {canEdit && (
          <Link href={`/projects/${id}/settings`}>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
        )}
      </div>

      {/* Workspace grid
           Mobile:  single column stack
           iPad lg: 2-col — timestamps left (row-span-2), video top-right, editor bottom-right
           Desktop xl: 3-col — timestamps | video | editor side-by-side */}
      <div className="grid gap-4
        lg:grid-cols-[300px_1fr] lg:[grid-template-rows:auto_1fr] lg:h-[calc(100vh-200px)]
        xl:grid-cols-[340px_1fr_380px] xl:[grid-template-rows:auto] xl:h-auto">

        {/* Col 1: Controls + Timestamp list
            lg: spans both rows | xl: single row with max-height */}
        <Card className="flex flex-col gap-3 overflow-hidden
          lg:row-span-2
          xl:row-span-1 xl:max-h-[calc(100vh-180px)]">
          <VideoControls onAddTimestamp={handleAddTimestamp} canEdit={canEdit} />
          <DrawingToolbar canEdit={canEdit} teamId={project.team_id} />
          <OverlayController timestamp={selectedTimestamp} canEdit={canEdit} />
          <div className="border-t border-border pt-2" />
          <div className="flex-1 overflow-auto min-h-0">
            <TimestampList
              timestamps={visibleTimestamps}
              athletes={athletes}
              timestampAthletes={timestampAthletesMap}
              onSelect={(tsId) => setSelectedTimestamp(tsId)}
              onSeek={handleSeek}
              teamId={project.team_id}
            />
          </div>
        </Card>

        {/* Col 2 / row 1: Video + canvas (same position at both breakpoints) */}
        <Card className="flex-shrink-0 flex flex-col gap-2 lg:col-start-2 lg:row-start-1 xl:col-start-2 xl:row-start-1">
          <div className="relative">
            <VideoPlayer videoId={project.youtube_id} />
            <TelestrationCanvas
              timestampId={selectedTimestampId}
              canEdit={canEdit}
            />
          </div>
          <div className="flex flex-col gap-2 px-1 pb-1">
            <p className="text-xs text-muted">
              Tip: Create timestamps for key plays, tag athletes, and draw telestrations.
            </p>
            <CoachIQ
              timestamps={visibleTimestamps}
              projectId={id}
              teamId={project.team_id}
            />
          </div>
        </Card>

        {/* Editor panel
            lg: col 2 / row 2 (below video) | xl: col 3 / row 1 (right column) */}
        <Card className="flex flex-col gap-4 overflow-auto min-h-0
          lg:col-start-2 lg:row-start-2
          xl:col-start-3 xl:row-start-1 xl:max-h-[calc(100vh-180px)]">
          <TimestampEditor
            timestamp={selectedTimestamp}
            projectId={id}
            canEdit={canEdit}
            onSeek={handleSeek}
            teamId={project.team_id}
          />

          <div className="border-t border-border pt-2" />

          <AthleteTagging
            timestampId={selectedTimestampId}
            athletes={athletes}
            taggedAthleteIds={selectedTimestampAthletes}
            canEdit={canEdit}
            projectId={id}
            projectTitle={project?.title}
            timestampTitle={selectedTimestamp?.title}
            taggedByName={profile?.full_name || user?.email || "Your coach"}
          />

          <div className="border-t border-border pt-2" />

          <CommentThread timestampId={selectedTimestampId} isTeamMember={!!teamMember} teamId={project.team_id} />
        </Card>
      </div>
    </div>
  );
}

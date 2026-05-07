"use client";

import React, { use, useEffect, useMemo, useState } from "react";
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
import { Columns3, LayoutPanelTop, Film, ChevronLeft, ChevronRight, Repeat, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceLayout } from "@/hooks/use-workspace-layout";

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

  const { layout, setLayout } = useWorkspaceLayout();
  const [filmroomPanelOpen, setFilmroomPanelOpen] = useState(true);
  const [filmroomAutoplay, setFilmroomAutoplay] = useState(true);

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

  // Auto-show/hide overlay and auto-pause/advance at end time
  const { pause, play } = useYouTubePlayer("yt-player");
  const autoPausedRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!selectedTimestamp) {
      setOverlayVisible(false);
      return;
    }
    const start = selectedTimestamp.time_seconds;
    const duration = selectedTimestamp.overlay_show_sec ?? 1;
    const overlayEnd = start + duration;
    const visible = currentTime >= start && currentTime <= overlayEnd;
    setOverlayVisible(visible);

    if (selectedTimestamp.end_time_seconds && currentTime >= selectedTimestamp.end_time_seconds) {
      if (autoPausedRef.current !== selectedTimestamp.id) {
        autoPausedRef.current = selectedTimestamp.id;

        if (layout === "filmroom" && filmroomAutoplay) {
          // Auto-advance to next timestamp instead of pausing
          const idx = sortedTimestamps.findIndex((ts) => ts.id === selectedTimestamp.id);
          const next = sortedTimestamps[idx + 1];
          if (next) {
            setSelectedTimestamp(next.id);
            seekTo(next.time_seconds);
            play();
            setStatus(`▶ ${next.title || formatTime(next.time_seconds)}`);
          } else {
            pause();
            setStatus("End of playlist");
          }
        } else {
          pause();
          setStatus(`Auto-paused at ${formatTime(selectedTimestamp.end_time_seconds)}`);
        }
      }
    } else {
      if (autoPausedRef.current === selectedTimestamp.id && currentTime < start) {
        autoPausedRef.current = null;
      }
    }
  }, [currentTime, selectedTimestamp, setOverlayVisible, pause, play, seekTo, setStatus, layout, filmroomAutoplay, sortedTimestamps, setSelectedTimestamp]);

  // Film room: auto-select the timestamp the video is currently inside (when autoplay on)
  const filmroomAutoRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (layout !== "filmroom" || !filmroomAutoplay || !playingTimestampId) return;
    if (filmroomAutoRef.current === playingTimestampId) return;
    filmroomAutoRef.current = playingTimestampId;
    setSelectedTimestamp(playingTimestampId);
  }, [layout, filmroomAutoplay, playingTimestampId, setSelectedTimestamp]);

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

  // In film room: highlight the most recent timestamp whose start <= currentTime
  const playingTimestampId = useMemo(() => {
    const candidate = [...visibleTimestamps]
      .filter((ts) => ts.time_seconds <= currentTime)
      .sort((a, b) => b.time_seconds - a.time_seconds)[0];
    if (!candidate) return null;
    if (candidate.end_time_seconds && currentTime > candidate.end_time_seconds) return null;
    return candidate.id;
  }, [visibleTimestamps, currentTime]);

  // Sorted timestamps for playlist prev/next navigation
  const sortedTimestamps = useMemo(
    () => [...visibleTimestamps].sort((a, b) => a.time_seconds - b.time_seconds),
    [visibleTimestamps]
  );
  const playlistIndex = useMemo(() => {
    const activeId = playingTimestampId ?? selectedTimestampId;
    return sortedTimestamps.findIndex((ts) => ts.id === activeId);
  }, [sortedTimestamps, playingTimestampId, selectedTimestampId]);

  const handlePrevTimestamp = () => {
    const target = sortedTimestamps[playlistIndex > 0 ? playlistIndex - 1 : 0];
    if (target) { setSelectedTimestamp(target.id); seekTo(target.time_seconds); }
  };
  const handleNextTimestamp = () => {
    const target = sortedTimestamps[playlistIndex + 1];
    if (target) { setSelectedTimestamp(target.id); seekTo(target.time_seconds); }
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
        <div className="flex items-center gap-2">
          {/* Layout toggle */}
          <div className="flex items-center rounded-lg border border-border p-1 gap-0.5">
            <button
              onClick={() => setLayout("balanced")}
              title="Balanced layout"
              className={cn(
                "rounded p-1.5 transition-colors",
                layout === "balanced" ? "bg-primary-bg text-primary" : "text-muted hover:text-text"
              )}
            >
              <Columns3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setLayout("video-focus")}
              title="Video focus"
              className={cn(
                "rounded p-1.5 transition-colors",
                layout === "video-focus" ? "bg-primary-bg text-primary" : "text-muted hover:text-text"
              )}
            >
              <LayoutPanelTop className="h-4 w-4" />
            </button>
            <button
              onClick={() => setLayout("filmroom")}
              title="Film room"
              className={cn(
                "rounded p-1.5 transition-colors",
                layout === "filmroom" ? "bg-primary-bg text-primary" : "text-muted hover:text-text"
              )}
            >
              <Film className="h-4 w-4" />
            </button>
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
      </div>

      {layout === "filmroom" ? (
        /*
          FILM ROOM: video fills full height, timestamps float left, controls float bottom
        */
        <div
          className="relative overflow-hidden rounded-xl bg-black"
          style={{ height: "calc(100vh - 180px)" }}
        >
          {/* Video + telestration centered in the black canvas */}
          <div className="absolute inset-0 flex items-center">
            <div className="relative w-full">
              <VideoPlayer videoId={project.youtube_id} />
              <TelestrationCanvas timestampId={selectedTimestampId} canEdit={canEdit} />
            </div>
          </div>

          {/* Floating left panel: timestamps */}
          <div
            className={cn(
              "absolute inset-y-0 left-0 z-10 flex w-72 flex-col",
              "border-r border-white/10 bg-black/80 backdrop-blur-md",
              "transition-transform duration-300 ease-in-out",
              !filmroomPanelOpen && "-translate-x-full"
            )}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2.5">
              <span className="text-sm font-bold text-white">Timestamps</span>
              <button
                onClick={() => setFilmroomPanelOpen(false)}
                className="rounded p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-2 [&_*]:!text-white/90 [&_button:hover]:!bg-white/10">
              <TimestampList
                timestamps={visibleTimestamps}
                athletes={athletes}
                timestampAthletes={timestampAthletesMap}
                onSelect={(tsId) => setSelectedTimestamp(tsId)}
                onSeek={handleSeek}
                teamId={project.team_id}
                activeTimestampId={playingTimestampId}
              />
            </div>
          </div>

          {/* Tab to re-open panel when collapsed */}
          <button
            onClick={() => setFilmroomPanelOpen(true)}
            className={cn(
              "absolute left-0 top-1/2 z-10 -translate-y-1/2",
              "rounded-r-xl border border-l-0 border-white/10 bg-black/60 px-1 py-3 backdrop-blur-md",
              "text-white/60 transition-all duration-300 hover:text-white",
              filmroomPanelOpen && "pointer-events-none opacity-0"
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Floating bottom bar: video controls + drawing tools */}
          <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-wrap items-start gap-3 border-t border-white/10 bg-black/80 px-4 py-2 backdrop-blur-md [&_*]:!text-white/80 [&_button:hover]:!bg-white/10 [&_button]:!border-white/10">
            <VideoControls onAddTimestamp={handleAddTimestamp} canEdit={canEdit} filmroom />
            <span className="hidden h-5 w-px bg-white/20 sm:block mt-0.5" />
            {/* Playlist: prev / next timestamp */}
            {sortedTimestamps.length > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                <button
                  onClick={handlePrevTimestamp}
                  disabled={playlistIndex <= 0}
                  title="Previous timestamp"
                  className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <span className="text-[10px] text-white/30">
                  {playlistIndex >= 0 ? `${playlistIndex + 1}/${sortedTimestamps.length}` : `—/${sortedTimestamps.length}`}
                </span>
                <button
                  onClick={handleNextTimestamp}
                  disabled={playlistIndex >= sortedTimestamps.length - 1}
                  title="Next timestamp"
                  className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setFilmroomAutoplay((v) => !v)}
                  title={filmroomAutoplay ? "Autoplay on — click to disable" : "Autoplay off — click to enable"}
                  className={cn(
                    "ml-1 flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs transition-colors",
                    filmroomAutoplay
                      ? "!bg-emerald-500/25 !border-emerald-500/50 !text-emerald-300"
                      : "!border-white/10 !text-white/30 hover:!text-white/60"
                  )}
                >
                  <Repeat className="h-3 w-3" />
                  Auto
                </button>
              </div>
            )}
            <span className="hidden h-5 w-px bg-white/20 sm:block mt-0.5" />
            <DrawingToolbar canEdit={canEdit} teamId={project.team_id} />
          </div>
        </div>
      ) : layout === "balanced" ? (
        /*
          BALANCED: timestamps | video | editor
          lg: 2-col (timestamps spans 2 rows), xl: 3-col side-by-side
        */
        <div className="grid gap-4
          lg:grid-cols-[300px_1fr] lg:[grid-template-rows:auto_1fr] lg:h-[calc(100vh-200px)]
          xl:grid-cols-[340px_1fr_380px] xl:[grid-template-rows:auto] xl:h-auto">

          <Card className="flex flex-col gap-3 overflow-hidden lg:row-span-2 xl:row-span-1 xl:max-h-[calc(100vh-180px)]">
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

          <Card className="flex flex-col gap-2 lg:col-start-2 lg:row-start-1 xl:col-start-2 xl:row-start-1 xl:max-h-[calc(100vh-180px)]">
            <div className="relative flex-shrink-0">
              <VideoPlayer videoId={project.youtube_id} />
              <TelestrationCanvas timestampId={selectedTimestampId} canEdit={canEdit} />
            </div>
            <div className="flex flex-col gap-2 px-1 pb-1 flex-1 overflow-hidden min-h-0">
              <p className="text-xs text-muted">
                Tip: Create timestamps for key plays, tag athletes, and draw telestrations.
              </p>
              <CoachIQ
                timestamps={visibleTimestamps}
                projectId={id}
                teamId={project.team_id}
                canEdit={canEdit}
                initialReport={project.coachiq_report}
                initialVisibility={project.coachiq_report_visibility ?? "coach_only"}
                initialGeneratedAt={project.coachiq_report_generated_at}
                onSave={async (report, visibility) => {
                  await supabase.from("projects").update({
                    coachiq_report: report,
                    coachiq_report_visibility: visibility,
                    coachiq_report_generated_at: new Date().toISOString(),
                  }).eq("id", id);
                }}
              />
            </div>
          </Card>

          <Card className="flex flex-col gap-4 overflow-auto min-h-0 lg:col-start-2 lg:row-start-2 xl:col-start-3 xl:row-start-1 xl:max-h-[calc(100vh-180px)]">
            <TimestampEditor timestamp={selectedTimestamp} projectId={id} canEdit={canEdit} onSeek={handleSeek} teamId={project.team_id} />
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
      ) : (
        /*
          VIDEO FOCUS — everything on screen, no scrolling needed:
          Left col (wider): video at top (16:9) + CoachIQ scrollable below
          Right col (360px): timestamps (top half) + editor/ODK/comments (bottom half)
        */
        <div className="grid gap-4 h-[calc(100vh-180px)]"
          style={{ gridTemplateColumns: "1fr 360px", gridTemplateRows: "1fr 1fr" }}>

          {/* Left col, spans both rows: video + CoachIQ */}
          <Card className="flex flex-col gap-2 row-span-2 min-h-0 overflow-hidden">
            <div className="relative flex-shrink-0">
              <VideoPlayer videoId={project.youtube_id} />
              <TelestrationCanvas timestampId={selectedTimestampId} canEdit={canEdit} />
            </div>
            <div className="flex flex-col gap-2 px-1 pb-1 flex-1 overflow-hidden min-h-0">
              <CoachIQ
                timestamps={visibleTimestamps}
                projectId={id}
                teamId={project.team_id}
                canEdit={canEdit}
                initialReport={project.coachiq_report}
                initialVisibility={project.coachiq_report_visibility ?? "coach_only"}
                initialGeneratedAt={project.coachiq_report_generated_at}
                onSave={async (report, visibility) => {
                  await supabase.from("projects").update({
                    coachiq_report: report,
                    coachiq_report_visibility: visibility,
                    coachiq_report_generated_at: new Date().toISOString(),
                  }).eq("id", id);
                }}
              />
            </div>
          </Card>

          {/* Right col, row 1: Timestamps */}
          <Card className="flex flex-col gap-3 overflow-hidden min-h-0 col-start-2 row-start-1">
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

          {/* Right col, row 2: Editor / ODK / Comments */}
          <Card className="flex flex-col gap-4 overflow-auto min-h-0 col-start-2 row-start-2">
            <TimestampEditor timestamp={selectedTimestamp} projectId={id} canEdit={canEdit} onSeek={handleSeek} teamId={project.team_id} />
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
      )}
    </div>
  );
}

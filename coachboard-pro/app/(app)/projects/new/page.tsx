"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateProject } from "@/hooks/use-project";
import { useAuth } from "@/components/auth/auth-provider";
import { parseYouTubeId } from "@/lib/youtube";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export default function NewProjectPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const router = useRouter();
  const createProject = useCreateProject();
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

  // Get user's teams
  const { data: teams } = useQuery({
    queryKey: ["my-teams", user?.id],
    queryFn: async () => {
      if (!user) return [] as { id: string; name: string }[];
      const { data: memberships } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .eq("status", "accepted");
      if (!memberships?.length) return [] as { id: string; name: string }[];
      const teamIds = memberships.map((m: { team_id: string }) => m.team_id);
      const { data: teamData } = await supabase
        .from("teams")
        .select("id, name")
        .in("id", teamIds);
      return (teamData ?? []) as { id: string; name: string }[];
    },
    enabled: !!user,
  });

  const [selectedTeamId, setSelectedTeamId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const youtubeId = parseYouTubeId(youtubeUrl);
    if (!youtubeId) {
      toast("Could not parse YouTube URL. Use a standard YouTube link.", "error");
      return;
    }

    const teamId = selectedTeamId || teams?.[0]?.id;
    if (!teamId) {
      toast("You need to create a team first. Go to Team settings.", "error");
      return;
    }

    try {
      const project = await createProject.mutateAsync({
        title,
        description,
        youtube_url: youtubeUrl,
        youtube_id: youtubeId,
        team_id: teamId,
      });
      router.push(`/projects/${project.id}`);
    } catch {
      toast("Failed to create project.", "error");
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-extrabold">New Project</h1>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Title</label>
          <Input
            placeholder="Game Film - Week 4 vs Eagles"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            placeholder="Optional notes about this project"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">YouTube URL</label>
          <Input
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            required
          />
        </div>

        {teams && teams.length > 1 && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Team</label>
            <select
              className="flex h-10 rounded-xl border border-border bg-input px-3 py-2 text-sm text-text"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
            >
              {(teams as { id: string; name: string }[]).map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          disabled={createProject.isPending}
        >
          {createProject.isPending ? "Creating..." : "Create project"}
        </Button>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateProject, useProjects } from "@/hooks/use-project";
import { useAuth } from "@/components/auth/auth-provider";
import { useSubscription } from "@/hooks/use-subscription";
import { parseYouTubeId } from "@/lib/youtube";
import { FREE_LIMITS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function NewProjectPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [category, setCategory] = useState<"game" | "practice">("game");
  const [manualTeamId, setManualTeamId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const router = useRouter();
  const createProject = useCreateProject();
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const { data: existingProjects } = useProjects();

  // Detect footage admin / support account
  const footageAdminEntries = (process.env.NEXT_PUBLIC_FOOTAGE_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const userEmail = (user?.email || "").toLowerCase();
  const isFootageAdmin = footageAdminEntries.some((entry) =>
    entry.startsWith("@")
      ? userEmail.endsWith(entry)
      : userEmail === entry
  );

  // Get user's teams (for regular coaches)
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
    enabled: !!user && !isFootageAdmin,
  });

  // Inherit Pro limits from head coach when acting under a team
  const effectiveTeamId = selectedTeamId || teams?.[0]?.id;
  const { canCreateProject } = useSubscription(effectiveTeamId);
  const atLimit = !canCreateProject(existingProjects?.length ?? 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const youtubeId = parseYouTubeId(youtubeUrl);
    if (!youtubeId) {
      toast("Could not parse YouTube URL. Use a standard YouTube link.", "error");
      return;
    }

    if (isFootageAdmin) {
      // Support account flow — use API route with team ID
      const teamId = manualTeamId.trim();
      if (!teamId) {
        toast("Please enter a Team ID.", "error");
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            youtubeUrl,
            youtubeId,
            teamId,
            category,
            createdBy: user!.id,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast(data.error || "Failed to create project.", "error");
          setSubmitting(false);
          return;
        }
        router.push(`/projects/${data.project.id}`);
      } catch {
        toast("Failed to create project.", "error");
        setSubmitting(false);
      }
      return;
    }

    // Regular coach flow
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
        category,
      });
      router.push(`/projects/${project.id}`);
    } catch {
      toast("Failed to create project.", "error");
    }
  };

  if (!isFootageAdmin && atLimit) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold">Project Limit Reached</h1>
        <p className="text-muted">
          Your free plan allows up to {FREE_LIMITS.maxProjects} projects.
          Upgrade to Pro for unlimited projects.
        </p>
        <div className="flex gap-3">
          <Link href="/settings/billing">
            <Button variant="primary">Upgrade to Pro</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="default">Back to dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-extrabold">New Project</h1>
      {isFootageAdmin && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          Support account — you can create projects for any team by entering their Team ID.
        </div>
      )}
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
          <label className="text-sm font-medium">Category</label>
          <div className="flex rounded-xl border border-border p-1">
            <button
              type="button"
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                category === "game"
                  ? "bg-primary-bg text-text shadow-sm"
                  : "text-muted hover:text-text"
              }`}
              onClick={() => setCategory("game")}
            >
              Game
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                category === "practice"
                  ? "bg-primary-bg text-text shadow-sm"
                  : "text-muted hover:text-text"
              }`}
              onClick={() => setCategory("practice")}
            >
              Practice
            </button>
          </div>
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

        {isFootageAdmin ? (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Team ID</label>
            <Input
              placeholder="Paste the team UUID from the booking request"
              value={manualTeamId}
              onChange={(e) => setManualTeamId(e.target.value)}
              required
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted">
              Find this in the booking request email or the admin panel.
            </p>
          </div>
        ) : (
          teams && teams.length > 1 && (
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
          )
        )}

        <Button
          type="submit"
          variant="primary"
          disabled={isFootageAdmin ? submitting : createProject.isPending}
        >
          {(isFootageAdmin ? submitting : createProject.isPending)
            ? "Creating..."
            : "Create project"}
        </Button>
      </form>
    </div>
  );
}

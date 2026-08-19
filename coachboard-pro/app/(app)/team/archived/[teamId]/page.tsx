"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";
import { MemberList } from "@/components/team/member-list";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Film } from "lucide-react";
import type { Team, Project } from "@/lib/supabase/types";

export default function ArchivedTeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = use(params);
  const { user } = useAuth();
  const supabase = createClient();

  // Verify the caller belongs to this team and it's actually archived —
  // RLS still grants access since leaving/archiving never removes the
  // team_members row, but this page should only render archived teams.
  const { data: team, isLoading } = useQuery({
    queryKey: ["archived-team", teamId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: membership } = await supabase
        .from("team_members")
        .select("team_id, teams(*)")
        .eq("team_id", teamId)
        .eq("user_id", user.id)
        .eq("status", "accepted")
        .single();
      const t = membership?.teams as unknown as Team | undefined;
      return t?.status === "archived" ? t : null;
    },
    enabled: !!user,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["archived-team-projects", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, category, created_at")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Pick<Project, "id" | "title" | "category" | "created_at">[];
    },
    enabled: !!team,
  });

  if (isLoading) {
    return <p className="text-muted">Loading...</p>;
  }

  if (!team) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold">Archived Team</h1>
        <p className="text-muted">
          This team isn't archived, or you don't have access to it.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold">{team.name}</h1>
          <Badge>Archived</Badge>
        </div>
        {team.archived_at && (
          <p className="text-sm text-muted">
            Archived {new Date(team.archived_at).toLocaleDateString()} — read only
          </p>
        )}
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <CardHeader>
          <CardTitle>Roster</CardTitle>
          <CardDescription>Team members at the time of archiving.</CardDescription>
        </CardHeader>
        <MemberList teamId={team.id} canManage={false} currentUserId={user!.id} />
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>Past footage and sessions.</CardDescription>
        </CardHeader>
        {projects.length === 0 ? (
          <p className="text-xs text-muted">No projects on this team.</p>
        ) : (
          projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="flex items-center gap-2 rounded-xl border border-border p-3 hover:border-muted"
            >
              <Film className="h-3.5 w-3.5 text-muted" />
              <span className="text-sm font-medium">{p.title}</span>
              <span className="ml-auto text-xs text-muted">
                {new Date(p.created_at).toLocaleDateString()}
              </span>
            </Link>
          ))
        )}
      </Card>
    </div>
  );
}

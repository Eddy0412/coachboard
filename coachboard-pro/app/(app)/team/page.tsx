"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { MemberList } from "@/components/team/member-list";
import { InviteModal } from "@/components/team/invite-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { canManageTeam } from "@/lib/permissions";
import type { Team, TeamMember } from "@/lib/supabase/types";

export default function TeamPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [teamName, setTeamName] = useState("");

  // Get user's teams
  const { data: teams = [] } = useQuery({
    queryKey: ["my-teams", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("team_members")
        .select("team_id, role, teams(*)")
        .eq("user_id", user.id)
        .eq("status", "accepted");
      return (
        data?.map((m) => ({
          ...(m.teams as unknown as Team),
          myRole: m.role,
        })) ?? []
      );
    },
    enabled: !!user,
  });

  const createTeam = useMutation({
    mutationFn: async (name: string) => {
      // Create team
      const { data: team, error: teamErr } = await supabase
        .from("teams")
        .insert({ name, created_by: user!.id })
        .select()
        .single();
      if (teamErr) throw teamErr;

      // Add self as head_coach
      const { error: memberErr } = await supabase
        .from("team_members")
        .insert({
          team_id: team.id,
          user_id: user!.id,
          role: "head_coach",
          invited_by: user!.id,
          status: "accepted",
        });
      if (memberErr) throw memberErr;

      return team as Team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-teams"] });
      setTeamName("");
      toast("Team created!", "success");
    },
    onError: () => {
      toast("Failed to create team.", "error");
    },
  });

  const activeTeam = teams[0] as (Team & { myRole: string }) | undefined;
  const isManager = activeTeam?.myRole === "head_coach";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Team</h1>
          <p className="text-sm text-muted">Manage your coaching team</p>
        </div>
        {activeTeam && isManager && (
          <InviteModal teamId={activeTeam.id} />
        )}
      </div>

      {!activeTeam ? (
        <Card className="flex flex-col gap-4 p-6">
          <CardHeader>
            <CardTitle>Create your team</CardTitle>
            <CardDescription>
              Get started by creating a team. You'll be the head coach.
            </CardDescription>
          </CardHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (teamName.trim()) createTeam.mutate(teamName.trim());
            }}
            className="flex gap-3"
          >
            <Input
              placeholder="Team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
            />
            <Button
              type="submit"
              variant="primary"
              disabled={createTeam.isPending}
            >
              {createTeam.isPending ? "Creating..." : "Create team"}
            </Button>
          </form>
        </Card>
      ) : (
        <Card className="flex flex-col gap-4 p-6">
          <CardHeader>
            <CardTitle>{activeTeam.name}</CardTitle>
            <CardDescription>Your role: {activeTeam.myRole}</CardDescription>
          </CardHeader>
          <MemberList
            teamId={activeTeam.id}
            canManage={isManager}
            currentUserId={user!.id}
          />
        </Card>
      )}
    </div>
  );
}

"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { RosterTable } from "@/components/team/roster-table";
import { canEditRoster } from "@/lib/permissions";
import type { Team, TeamMember } from "@/lib/supabase/types";

export default function RosterPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const { data: teamData } = useQuery({
    queryKey: ["my-team-for-roster", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("team_members")
        .select("team_id, role")
        .eq("user_id", user.id)
        .eq("status", "accepted")
        .limit(1)
        .single();
      return data as { team_id: string; role: string } | null;
    },
    enabled: !!user,
  });

  if (!teamData) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold">Roster</h1>
        <p className="text-muted">
          You need to be part of a team to manage the roster.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <RosterTable
        teamId={teamData.team_id}
        canEdit={
          teamData.role === "head_coach" || teamData.role === "coach"
        }
      />
    </div>
  );
}

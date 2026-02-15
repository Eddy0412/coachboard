"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { TeamMember, Profile } from "@/lib/supabase/types";

interface MemberListProps {
  teamId: string;
  canManage: boolean;
  currentUserId: string;
}

export function MemberList({ teamId, canManage, currentUserId }: MemberListProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: members = [] } = useQuery({
    queryKey: ["team-members", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*, profiles:user_id(full_name, email)")
        .eq("team_id", teamId)
        .order("created_at");
      if (error) throw error;
      return data as (TeamMember & {
        profiles: Pick<Profile, "full_name" | "email">;
      })[];
    },
    enabled: !!teamId,
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", teamId] });
    },
  });

  const roleVariant = (role: string) => {
    switch (role) {
      case "head_coach":
        return "primary" as const;
      case "coach":
        return "success" as const;
      default:
        return "default" as const;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-bold">Members</h3>
      {members.length === 0 ? (
        <p className="text-xs text-muted">No members yet.</p>
      ) : (
        members.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between rounded-xl border border-border p-3"
          >
            <div className="flex items-center gap-3">
              <div>
                <div className="text-sm font-medium">
                  {m.profiles?.full_name || m.profiles?.email || "Unknown"}
                </div>
                <div className="text-xs text-muted">{m.profiles?.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={roleVariant(m.role)}>{m.role}</Badge>
              <Badge variant={m.status === "accepted" ? "success" : "warning"}>
                {m.status}
              </Badge>
              {canManage && m.user_id !== currentUserId && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => removeMember.mutate(m.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

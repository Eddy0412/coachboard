"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Shield, Users } from "lucide-react";
import type { TeamMember, Profile } from "@/lib/supabase/types";

interface MemberListProps {
  teamId: string;
  canManage: boolean;
  currentUserId: string;
}

type MemberWithProfile = TeamMember & {
  profiles: Pick<Profile, "full_name" | "email">;
};

function MemberRow({
  member,
  canManage,
  currentUserId,
  onRemove,
}: {
  member: MemberWithProfile;
  canManage: boolean;
  currentUserId: string;
  onRemove: (id: string) => void;
}) {
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

  const roleLabel = (role: string) => {
    switch (role) {
      case "head_coach":
        return "Head Coach";
      case "coach":
        return "Coach";
      default:
        return "Athlete";
    }
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-border p-3">
      <div className="flex items-center gap-3">
        <div>
          <div className="text-sm font-medium">
            {member.profiles?.full_name || member.profiles?.email || "Unknown"}
          </div>
          <div className="text-xs text-muted">{member.profiles?.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={roleVariant(member.role)}>{roleLabel(member.role)}</Badge>
        <Badge variant={member.status === "accepted" ? "success" : "warning"}>
          {member.status}
        </Badge>
        {canManage && member.user_id !== currentUserId && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => onRemove(member.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
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
      return data as MemberWithProfile[];
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

  const staff = members.filter((m) => m.role === "head_coach" || m.role === "coach");
  const athletes = members.filter((m) => m.role === "athlete");

  return (
    <div className="flex flex-col gap-6">
      {/* Staff Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Staff</h3>
          <span className="text-xs text-muted">({staff.length})</span>
        </div>
        {staff.length === 0 ? (
          <p className="text-xs text-muted">No staff members yet.</p>
        ) : (
          staff.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              canManage={canManage}
              currentUserId={currentUserId}
              onRemove={(id) => removeMember.mutate(id)}
            />
          ))
        )}
      </div>

      {/* Athletes Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-bold">Athletes</h3>
          <span className="text-xs text-muted">({athletes.length})</span>
        </div>
        {athletes.length === 0 ? (
          <p className="text-xs text-muted">No athletes yet. Invite athletes from the Team page.</p>
        ) : (
          athletes.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              canManage={canManage}
              currentUserId={currentUserId}
              onRemove={(id) => removeMember.mutate(id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

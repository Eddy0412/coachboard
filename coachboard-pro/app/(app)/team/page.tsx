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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { canManageTeam } from "@/lib/permissions";
import { Copy, Trash2, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";
import type { Team, TeamMember, Invitation } from "@/lib/supabase/types";

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
      // Create team — insert without .select() to avoid RLS SELECT policy issue
      const { error: teamErr } = await supabase
        .from("teams")
        .insert({ name, created_by: user!.id });
      if (teamErr) throw teamErr;

      // Fetch the team we just created using service-level query
      const { data: teams } = await supabase
        .from("teams")
        .select("*")
        .eq("name", name)
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false })
        .limit(1);

      // If we can't read it yet (RLS), fetch via team_members after inserting
      let teamId: string;
      if (teams && teams.length > 0) {
        teamId = teams[0].id;
      } else {
        // Fallback: use RPC or direct ID generation
        throw new Error("Could not retrieve created team");
      }

      // Add self as head_coach
      const { error: memberErr } = await supabase
        .from("team_members")
        .insert({
          team_id: teamId,
          user_id: user!.id,
          role: "head_coach",
          invited_by: user!.id,
          status: "accepted",
        });
      if (memberErr) throw memberErr;

      return { id: teamId, name, created_by: user!.id, created_at: new Date().toISOString() } as Team;
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

  // All invitations
  const { data: invitations = [] } = useQuery({
    queryKey: ["invitations", activeTeam?.id],
    queryFn: async () => {
      if (!activeTeam) return [];
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("team_id", activeTeam.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Auto-mark expired invitations
      const now = new Date();
      const results = (data ?? []) as Invitation[];
      for (const inv of results) {
        if (inv.status === "pending" && new Date(inv.expires_at) < now) {
          inv.status = "expired" as Invitation["status"];
          supabase.from("invitations").update({ status: "expired" }).eq("id", inv.id);
        }
      }
      return results;
    },
    enabled: !!activeTeam && isManager,
  });

  const deleteInvitation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invitations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations", activeTeam?.id] });
      toast("Invitation removed.", "success");
    },
  });

  const resendInvitation = useMutation({
    mutationFn: async (oldInvite: Invitation) => {
      // Delete the old expired invite
      await supabase.from("invitations").delete().eq("id", oldInvite.id);

      // Create a fresh one
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      const token = Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase.from("invitations").insert({
        team_id: oldInvite.team_id,
        email: oldInvite.email,
        phone: oldInvite.phone,
        role: oldInvite.role,
        token,
        invited_by: user!.id,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      });
      if (error) throw error;

      // Try to send email
      let emailSent = false;
      try {
        const res = await fetch("/api/notifications/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "invite",
            to: oldInvite.email,
            data: { token, role: oldInvite.role, teamId: oldInvite.team_id },
          }),
        });
        emailSent = res.ok;
      } catch { /* best effort */ }

      return { emailSent, token };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["invitations", activeTeam?.id] });
      if (result.emailSent) {
        toast("Invitation resent and email delivered!", "success");
      } else {
        toast("Invitation resent! Copy the invite link to share manually.", "success");
      }
    },
    onError: () => {
      toast("Failed to resend invitation.", "error");
    },
  });

  const appUrl = typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
    : "";

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

      {/* Invitations */}
      {isManager && invitations.length > 0 && (
        <Card className="flex flex-col gap-4 p-6">
          <CardHeader>
            <CardTitle>Invitations</CardTitle>
            <CardDescription>
              Track invitation status. Copy invite links for pending invitations.
            </CardDescription>
          </CardHeader>
          {invitations.map((inv) => {
            const isPending = inv.status === "pending";
            const isAccepted = inv.status === "accepted";
            const isExpired = inv.status === "expired";
            return (
              <div
                key={inv.id}
                className={`flex items-center justify-between rounded-xl border p-3 ${
                  isExpired ? "border-border opacity-60" : "border-border"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isPending && <Clock className="h-3.5 w-3.5 text-amber-500" />}
                  {isAccepted && <CheckCircle className="h-3.5 w-3.5 text-success" />}
                  {isExpired && <XCircle className="h-3.5 w-3.5 text-muted" />}
                  <span className="text-sm font-medium">{inv.email}</span>
                  <Badge className="ml-1">{inv.role}</Badge>
                  <Badge
                    variant={isAccepted ? "primary" : "default"}
                  >
                    {inv.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  {isPending && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const ok = copyToClipboard(`${appUrl}/invite/${inv.token}`);
                        toast(ok ? "Invite link copied!" : "Could not copy.", ok ? "success" : "error");
                      }}
                    >
                      <Copy className="h-3 w-3" />
                      Copy link
                    </Button>
                  )}
                  {isExpired && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => resendInvitation.mutate(inv)}
                      disabled={resendInvitation.isPending}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Resend
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteInvitation.mutate(inv.id)}
                    disabled={deleteInvitation.isPending}
                    title="Remove invitation"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

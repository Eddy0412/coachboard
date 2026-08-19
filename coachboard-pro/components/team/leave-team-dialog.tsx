"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { LogOut } from "lucide-react";

interface LeaveTeamDialogProps {
  team: { id: string; name: string; myRole: string };
  trigger?: React.ReactNode;
  onLeft?: () => void;
}

type Step = "confirm" | "transfer" | "sole";

export function LeaveTeamDialog({ team, trigger, onLeft }: LeaveTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const isHeadCoach = team.myRole === "head_coach";

  const { data: otherStaff = [] } = useQuery({
    queryKey: ["team-other-staff", team.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("user_id, role, profiles:user_id(full_name, email)")
        .eq("team_id", team.id)
        .eq("status", "accepted")
        .in("role", ["head_coach", "coach"])
        .neq("user_id", user!.id);
      if (error) throw error;
      return data as unknown as {
        user_id: string;
        role: string;
        profiles: { full_name: string; email: string } | null;
      }[];
    },
    enabled: open && isHeadCoach && !!user,
  });

  const step: Step = !isHeadCoach
    ? "confirm"
    : otherStaff.length > 0
      ? "transfer"
      : "sole";

  const handleSuccess = (message: string) => {
    queryClient.invalidateQueries({ queryKey: ["my-teams"] });
    setOpen(false);
    toast(message, "success");
    onLeft?.();
  };

  const leave = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/team/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to leave team");
      return data;
    },
    onSuccess: () => handleSuccess(`You've left ${team.name}.`),
    onError: (err: Error) => toast(err.message, "error"),
  });

  const transfer = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/team/transfer-head-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id, newHeadCoachUserId: selectedTarget }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to transfer head coach role");
      return data;
    },
    onSuccess: () => handleSuccess(`Head coach role transferred — you've left ${team.name}.`),
    onError: (err: Error) => toast(err.message, "error"),
  });

  const archive = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/team/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to archive team");
      return data;
    },
    onSuccess: () => handleSuccess(`${team.name} has been archived.`),
    onError: (err: Error) => toast(err.message, "error"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/team/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete team");
      return data;
    },
    onSuccess: () => handleSuccess(`${team.name} has been deleted.`),
    onError: (err: Error) => toast(err.message, "error"),
  });

  const isPending = leave.isPending || transfer.isPending || archive.isPending || remove.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button variant="danger" onClick={() => setOpen(true)}>
          <LogOut className="h-4 w-4" />
          Leave Team
        </Button>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave {team.name}</DialogTitle>
          {step === "confirm" && (
            <DialogDescription>
              You'll be removed from this team. The roster and your teammates are unaffected.
            </DialogDescription>
          )}
          {step === "transfer" && (
            <DialogDescription>
              As head coach, you need to hand off the role before leaving.
            </DialogDescription>
          )}
          {step === "sole" && (
            <DialogDescription>
              You're the only member of {team.name}. Choose what happens to it.
            </DialogDescription>
          )}
        </DialogHeader>

        {step === "confirm" && (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => leave.mutate()} disabled={isPending}>
              {leave.isPending ? "Leaving..." : "Leave Team"}
            </Button>
          </div>
        )}

        {step === "transfer" && (
          <div className="flex flex-col gap-4">
            <Select
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
            >
              <option value="">Select a new head coach...</option>
              {otherStaff.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profiles?.full_name || m.profiles?.email || "Unknown"}
                </option>
              ))}
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => transfer.mutate()}
                disabled={!selectedTarget || isPending}
              >
                {transfer.isPending ? "Transferring..." : "Transfer & Leave"}
              </Button>
            </div>
          </div>
        )}

        {step === "sole" && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-border p-3">
              <p className="text-sm font-medium">Archive Team</p>
              <p className="text-xs text-muted">
                Moves {team.name} to your Archived Teams. Its roster and data stay saved and
                viewable anytime.
              </p>
              <Button
                variant="default"
                size="sm"
                className="mt-2"
                onClick={() => archive.mutate()}
                disabled={isPending}
              >
                {archive.isPending ? "Archiving..." : "Archive Team"}
              </Button>
            </div>
            <div className="rounded-xl border border-danger-br p-3">
              <p className="text-sm font-medium">Delete Team</p>
              <p className="text-xs text-muted">
                Removes {team.name} from your team list. Its data is retained in the backend
                but won't be accessible in the app.
              </p>
              <Button
                variant="danger"
                size="sm"
                className="mt-2"
                onClick={() => remove.mutate()}
                disabled={isPending}
              >
                {remove.isPending ? "Deleting..." : "Delete Team"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

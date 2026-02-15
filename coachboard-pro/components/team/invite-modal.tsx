"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import type { UserRole } from "@/lib/supabase/types";

interface InviteModalProps {
  teamId: string;
}

export function InviteModal({ teamId }: InviteModalProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"coach" | "athlete">("athlete");
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const invite = useMutation({
    mutationFn: async () => {
      const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase.from("invitations").insert({
        team_id: teamId,
        email,
        phone: phone || null,
        role,
        token,
        invited_by: user!.id,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      });
      if (error) throw error;

      // Send invite email via API
      try {
        await fetch("/api/notifications/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "invite",
            to: email,
            data: {
              token,
              role,
              teamId,
            },
          }),
        });
      } catch {
        // Email sending is best-effort
      }

      // Send WhatsApp if phone provided
      if (phone) {
        try {
          await fetch("/api/notifications/whatsapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "invite",
              to: phone,
              data: { token, role, teamId },
            }),
          });
        } catch {
          // WhatsApp is best-effort
        }
      }

      return token;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", teamId] });
      setOpen(false);
      setEmail("");
      setPhone("");
      toast("Invitation sent!", "success");
    },
    onError: () => {
      toast("Failed to send invitation.", "error");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Invite
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to team</DialogTitle>
          <DialogDescription>
            Send an invitation via email and/or WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            invite.mutate();
          }}
          className="flex flex-col gap-4"
        >
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="tel"
            placeholder="Phone (for WhatsApp, optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as "coach" | "athlete")}
          >
            <option value="athlete">Athlete</option>
            <option value="coach">Coach</option>
          </Select>
          <Button
            type="submit"
            variant="primary"
            disabled={invite.isPending}
          >
            {invite.isPending ? "Sending..." : "Send invitation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

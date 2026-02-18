"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { SignupForm } from "@/components/auth/signup-form";
import { LoginForm } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import type { Invitation } from "@/lib/supabase/types";

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [accepting, setAccepting] = useState(false);

  // Fetch invitation via API route (bypasses RLS for unauthenticated users)
  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await fetch(`/api/invitations?token=${encodeURIComponent(token)}`);
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        setInvitation(data as Invitation);
      } catch {
        // fetch failed
      }
      setLoading(false);
    };
    fetchInvite();
  }, [token]);

  // If user is logged in, accept the invite
  useEffect(() => {
    if (authLoading || !user || !invitation || accepting) return;

    const acceptInvite = async () => {
      setAccepting(true);

      // Use API route (service role) to handle acceptance,
      // team_members upsert, and athlete roster insert
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId: invitation.id,
          userId: user.id,
        }),
      });

      if (!res.ok) {
        toast("Failed to accept invitation.", "error");
        setAccepting(false);
        return;
      }

      toast("Welcome to the team!", "success");
      router.push("/dashboard");
    };

    acceptInvite();
  }, [user, invitation, authLoading, accepting, router, toast]);

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading invitation...</p>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-sm p-6 text-center">
          <h2 className="mb-2 text-lg font-bold">Invalid Invitation</h2>
          <p className="text-sm text-muted">
            This invitation link is expired or invalid.
          </p>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => router.push("/login")}
          >
            Go to login
          </Button>
        </Card>
      </div>
    );
  }

  if (accepting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Joining team...</p>
      </div>
    );
  }

  // Show signup/login form
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold">Coachboard Pro</h1>
          <p className="mt-2 text-sm text-muted">
            You've been invited to join as{" "}
            <strong>{invitation.role}</strong>
          </p>
        </div>

        <Card className="p-6">
          <div className="mb-4 flex rounded-xl border border-border">
            <button
              className={`flex-1 rounded-l-xl px-3 py-2 text-sm ${
                mode === "signup"
                  ? "bg-primary-bg text-text"
                  : "text-muted"
              }`}
              onClick={() => setMode("signup")}
            >
              Sign up
            </button>
            <button
              className={`flex-1 rounded-r-xl px-3 py-2 text-sm ${
                mode === "login"
                  ? "bg-primary-bg text-text"
                  : "text-muted"
              }`}
              onClick={() => setMode("login")}
            >
              Sign in
            </button>
          </div>

          {mode === "signup" ? (
            <SignupForm
              inviteToken={token}
              prefilledEmail={invitation.email}
              lockedRole={invitation.role === "athlete" ? "athlete" : undefined}
            />
          ) : (
            <LoginForm />
          )}
        </Card>
      </div>
    </div>
  );
}

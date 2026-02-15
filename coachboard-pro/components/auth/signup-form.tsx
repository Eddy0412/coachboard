"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SignupFormProps {
  inviteToken?: string;
  prefilledEmail?: string;
  lockedRole?: "athlete";
}

export function SignupForm({
  inviteToken,
  prefilledEmail,
  lockedRole,
}: SignupFormProps) {
  const [email, setEmail] = useState(prefilledEmail || "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const role = lockedRole || "coach";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          default_role: role,
          invite_token: inviteToken,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (inviteToken) {
      router.push(`/invite/${inviteToken}`);
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="fullName">
          Full Name
        </label>
        <Input
          id="fullName"
          type="text"
          placeholder="John Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="coach@team.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          readOnly={!!prefilledEmail}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="password">
          Password
        </label>
        <Input
          id="password"
          type="password"
          placeholder="Min 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Role</label>
        <div className="flex h-10 items-center rounded-xl border border-border bg-input px-3 text-sm text-muted">
          {lockedRole === "athlete" ? "Athlete (invited)" : "Coach"}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" variant="primary" disabled={loading}>
        {loading ? "Creating account..." : "Create account"}
      </Button>

      {!inviteToken && (
        <p className="text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="hover:text-text">
            Sign in
          </Link>
        </p>
      )}
    </form>
  );
}

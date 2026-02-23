"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { FREE_LIMITS, PRO_LIMITS } from "@/lib/constants";

const rank = (s: string | null | undefined) =>
  s === "elite" ? 2 : s === "pro" ? 1 : 0;

export function useSubscription(teamId?: string | null) {
  const { profile } = useAuth();
  const supabase = createClient();

  // Query team owner's subscription when teamId provided
  const { data: teamOwnerStatus } = useQuery({
    queryKey: ["team-owner-subscription", teamId],
    queryFn: async () => {
      const { data: team } = await supabase
        .from("teams")
        .select("created_by")
        .eq("id", teamId!)
        .single();
      if (!team) return null;
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("subscription_status")
        .eq("id", (team as { created_by: string }).created_by)
        .single();
      return (ownerProfile as { subscription_status: string } | null)?.subscription_status ?? null;
    },
    enabled: !!teamId,
    staleTime: 60_000,
  });

  const ownStatus = profile?.subscription_status ?? "free";
  const effective =
    rank(teamOwnerStatus) > rank(ownStatus) ? teamOwnerStatus! : ownStatus;

  const isPro = effective === "pro" || effective === "elite";
  const isElite = effective === ("elite" as string);

  return {
    isPro,
    isElite,
    status: effective,
    limits: isElite ? null : isPro ? PRO_LIMITS : FREE_LIMITS,
    canCreateProject: (currentCount: number) =>
      isPro || currentCount < FREE_LIMITS.maxProjects,
    canCreateTeam: (currentCount: number) =>
      isElite || currentCount < (isPro ? PRO_LIMITS.maxTeams : FREE_LIMITS.maxTeams),
    canAddAthlete: (currentCount: number) =>
      isPro || currentCount < FREE_LIMITS.maxAthletes,
    canUseNotifications: isPro,
    canUseShareLinks: isPro,
    canUseComments: isPro,
    canUseCsvExport: isPro,
  };
}

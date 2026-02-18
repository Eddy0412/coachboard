"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { FREE_LIMITS, PRO_LIMITS } from "@/lib/constants";

export function useSubscription() {
  const { profile } = useAuth();
  const isPro = profile?.subscription_status === "pro";
  const isElite = profile?.subscription_status === ("elite" as string);

  return {
    isPro,
    isElite,
    status: profile?.subscription_status ?? "free",
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

"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { FREE_LIMITS } from "@/lib/constants";

export function useSubscription() {
  const { profile } = useAuth();
  const isPro = profile?.subscription_status === "pro";

  return {
    isPro,
    status: profile?.subscription_status ?? "free",
    limits: isPro ? null : FREE_LIMITS,
    canCreateProject: (currentCount: number) =>
      isPro || currentCount < FREE_LIMITS.maxProjects,
    canAddAthlete: (currentCount: number) =>
      isPro || currentCount < FREE_LIMITS.maxAthletes,
    canUseNotifications: isPro,
    canUseShareLinks: isPro,
    canUseComments: isPro,
    canUseCsvExport: isPro,
  };
}

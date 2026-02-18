"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/components/auth/auth-provider";
import { isAthlete } from "@/lib/permissions";
import { Sparkles } from "lucide-react";

export function UpgradeBanner() {
  const { isPro } = useSubscription();
  const { profile } = useAuth();

  // Athletes don't manage billing — hide upgrade prompts
  if (isPro || isAthlete(profile)) return null;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-primary-br bg-primary-bg p-4">
      <Sparkles className="h-5 w-5 text-primary shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium">Upgrade to Pro</p>
        <p className="text-xs text-muted">
          Unlimited projects, teams, notifications, sharing, and more.
        </p>
      </div>
      <Link href="/settings/billing">
        <Button variant="primary" size="sm">
          Upgrade
        </Button>
      </Link>
    </div>
  );
}

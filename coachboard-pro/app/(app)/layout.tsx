"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Sidebar } from "@/components/dashboard/sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { TourGuide } from "@/components/dashboard/tour-guide";
import { GuidedSetup, type OnboardingStage } from "@/components/onboarding/guided-setup";
import { ONBOARDING_STAGE_KEY, ONBOARDING_COMPLETED_KEY } from "@/lib/onboarding";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { FeedbackButton } from "@/components/feedback/feedback-button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [onboardingStage, setOnboardingStage] = useState<OnboardingStage>("idle");

  // Resume an in-progress guided setup across reloads.
  useEffect(() => {
    if (!user?.id) return;
    const saved = localStorage.getItem(ONBOARDING_STAGE_KEY(user.id));
    if (
      saved === "team" ||
      saved === "create_project" ||
      saved === "timestamp" ||
      saved === "demo" ||
      saved === "delete_project"
    ) {
      setOnboardingStage(saved);
    }
  }, [user?.id]);

  function updateStage(stage: OnboardingStage) {
    setOnboardingStage(stage);
    if (user?.id) {
      if (stage === "idle" || stage === "done") {
        localStorage.removeItem(ONBOARDING_STAGE_KEY(user.id));
      } else {
        localStorage.setItem(ONBOARDING_STAGE_KEY(user.id), stage);
      }
      if (stage === "done") {
        localStorage.setItem(ONBOARDING_COMPLETED_KEY(user.id), "true");
      }
    }
  }

  function startGuidedTour() {
    if (user?.id && localStorage.getItem(ONBOARDING_COMPLETED_KEY(user.id))) {
      // Already been through this once (finished or skipped) — don't restart
      // it just because the intro modal happened to show again.
      return;
    }
    updateStage("team");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <TourGuide onPickCoach={startGuidedTour} />
      <GuidedSetup stage={onboardingStage} onStageChange={updateStage} />
      <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:justify-end sm:px-6">
          <div className="flex items-center gap-2 sm:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
              className="rounded-lg p-1.5 text-muted hover:bg-input hover:text-text transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-1.5">
              <Image src="/logo.png" alt="Coachboard Pro logo" width={20} height={20} />
              <span className="text-sm font-extrabold">Coachboard</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <FeedbackButton />
    </div>
  );
}

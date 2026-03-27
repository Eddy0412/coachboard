"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Film,
  Users,
  Settings,
  HelpCircle,
  Bell,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";

const STEPS = [
  {
    icon: LayoutDashboard,
    title: "Welcome to Coachboard Pro",
    description:
      "Your all-in-one platform for film breakdown, telestration, roster management, and team collaboration. Let's take a quick tour.",
  },
  {
    icon: Film,
    title: "Dashboard & Projects",
    description:
      "Your Dashboard is where all your coaching projects live. Create a new project, load a YouTube video, and start breaking down film with timestamped notes.",
  },
  {
    icon: LayoutDashboard,
    title: "Telestration",
    description:
      "Inside a project, open the video player and draw directly on the frame — circles, arrows, and lines in multiple colors. Drawings are saved per timestamp.",
  },
  {
    icon: Users,
    title: "Team & Roster",
    description:
      "Invite coaches and athletes from the Team section. Assign roles, manage your roster, and share projects so everyone has access to the right film.",
  },
  {
    icon: Bell,
    title: "Notifications",
    description:
      "Get notified when teammates comment on a project or share footage with you. Stay on top of your coaching workflow without missing a beat.",
  },
  {
    icon: Settings,
    title: "Settings & Billing",
    description:
      "Update your profile, manage your subscription, and configure footage booking services — all from the Settings section in the sidebar.",
  },
  {
    icon: HelpCircle,
    title: "Support",
    description:
      "Need help? Visit the Support section for the Knowledge Base, Documentation, Video Tutorials, and Tickets. We're here whenever you need us.",
  },
];

const STORAGE_KEY = (userId: string) => `tour_dismissed_${userId}`;

export function TourGuide() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const dismissed = localStorage.getItem(STORAGE_KEY(user.id));
    if (!dismissed) setVisible(true);
  }, [user?.id]);

  function close() {
    if (dontShow && user?.id) {
      localStorage.setItem(STORAGE_KEY(user.id), "true");
    }
    setVisible(false);
  }

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
        {/* Close */}
        <button
          onClick={close}
          className="absolute right-4 top-4 text-muted hover:text-text transition-colors"
          aria-label="Close tour"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Step indicator */}
        <div className="mb-6 flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="mb-5 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-bg">
            <Icon className="h-7 w-7 text-primary" />
          </div>
        </div>

        {/* Content */}
        <h2 className="mb-3 text-center text-xl font-extrabold">{current.title}</h2>
        <p className="mb-8 text-center text-sm leading-relaxed text-muted">
          {current.description}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          {isLast ? (
            <Button variant="primary" onClick={close}>
              Get started
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Don't show again */}
        <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          Don&apos;t show this again
        </label>
      </div>
    </div>
  );
}

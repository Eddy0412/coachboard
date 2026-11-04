"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Joyride, STATUS, type Step, type EventHandler, type Options } from "react-joyride";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { GLOBAL_DEMO_PROJECT_ID, ONBOARDING_OWN_PROJECT_KEY } from "@/lib/onboarding";

// team: create a real team.
// create_project: on /dashboard, click "New project"; on /projects/new, fill
//   in the form. (Two sub-phases of one stage, since they're different pages.)
// timestamp: on the coach's own new project, add their first timestamp.
// demo: capstone — look around a fully-populated example project.
// delete_project: back on their own (practice) project, guided to delete it —
//   ends on a clean, empty dashboard ready for their real first project.
export type OnboardingStage =
  | "idle"
  | "team"
  | "create_project"
  | "timestamp"
  | "demo"
  | "delete_project"
  | "done";

interface GuidedSetupProps {
  stage: OnboardingStage;
  onStageChange: (stage: OnboardingStage) => void;
}

const JOYRIDE_OPTIONS: Partial<Options> = {
  buttons: ["back", "close", "primary", "skip"],
  backgroundColor: "var(--color-card)",
  textColor: "var(--color-text)",
  primaryColor: "var(--color-primary)",
  arrowColor: "var(--color-card)",
  overlayColor: "rgba(0,0,0,0.6)",
  zIndex: 10000,
};

// "Action" stages need the coach to type/click on the *real* element while
// the tooltip is showing, across several different fields in sequence
// (e.g. title, then video URL, then the submit button). Joyride's own
// overlay/spotlight only ever keeps the *current* step's target interactive
// — every other field on the page stays blocked until the tour is manually
// advanced to it. That's wrong for a form you're meant to use freely, so
// these stages render with hideOverlay (nothing on the page is ever
// blocked), and a separate .onboarding-spotlight CSS class (applied below,
// driven by the live step index) gives the precise visual highlight the
// overlay would otherwise have provided. The "demo" stage is pure
// look-around with nothing to click, so it keeps Joyride's normal overlay.
const TEAM_STEPS: Step[] = [
  {
    target: '[data-tour="team-name-input"]',
    content: "Name your team — you'll be the head coach. You can rename it anytime.",
    skipBeacon: true,
    placement: "bottom",
  },
  {
    target: '[data-tour="create-team-button"]',
    content: "Then click here to create it.",
    placement: "bottom",
  },
];

const DASHBOARD_NEW_PROJECT_STEPS: Step[] = [
  {
    target: '[data-tour="new-project-button"]',
    content: "Your team's ready. Click here to create your first project.",
    skipBeacon: true,
    placement: "bottom",
  },
];

const CREATE_PROJECT_STEPS: Step[] = [
  {
    target: '[data-tour="project-title-input"]',
    content: "Give it a title — this one's required.",
    skipBeacon: true,
    placement: "bottom",
  },
  {
    target: '[data-tour="youtube-url-input"]',
    content: "We've filled in an example game so you can try this right away — paste your own film anytime.",
    placement: "bottom",
  },
  {
    target: '[data-tour="create-project-button"]',
    content: "Then click here to create it.",
    placement: "bottom",
  },
];

const TIMESTAMP_STEPS: Step[] = [
  {
    target: '[data-tour="add-timestamp-button"]',
    content: "Click here to add your first timestamp at the current point in the video.",
    skipBeacon: true,
    placement: "bottom",
  },
];

const DEMO_STEPS: Step[] = [
  {
    target: '[data-tour="telestration-canvas"]',
    content: "One last thing — here's what a fully broken-down project looks like. Drawings are saved per play.",
    skipBeacon: true,
    placement: "bottom",
  },
  {
    target: '[data-tour="timestamp-list"]',
    content: "Every tagged play lives here — down, distance, formation, and more, all timestamped to the film.",
    placement: "right",
  },
  {
    target: '[data-tour="coachiq-panel"]',
    content: "And this is CoachIQ — it reads the tagged plays and builds a heatmap and scouting report automatically.",
    placement: "left",
  },
];

const SETTINGS_LINK_STEPS: Step[] = [
  {
    target: '[data-tour="project-settings-link"]',
    content: "That project was just for practice. Let's clean it up — click Settings to find it.",
    skipBeacon: true,
    placement: "bottom",
  },
];

const DELETE_PROJECT_STEPS: Step[] = [
  {
    target: '[data-tour="delete-project-button"]',
    content: "Click here to delete it — you'll land on a clean, empty dashboard, ready for your real first project.",
    skipBeacon: true,
    placement: "bottom",
  },
];

const NEW_PROJECT_ID_RE = /^\/projects\/([^/]+)$/;

interface ActiveTourConfig {
  key: string;
  steps: Step[];
  /** Whether this stage needs hideOverlay + the custom spotlight class. */
  isAction: boolean;
}

export function GuidedSetup({ stage, onStageChange }: GuidedSetupProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [activeIndex, setActiveIndex] = useState(0);

  const demoProjectPath = GLOBAL_DEMO_PROJECT_ID ? `/projects/${GLOBAL_DEMO_PROJECT_ID}` : null;

  // The real project the coach creates during "create_project"/"timestamp" —
  // extracted from the URL once we land on it. Excludes "new" (the create
  // form's own path, /projects/new, also matches the id-capture regex) and
  // the demo project.
  const ownProjectMatch = pathname.match(NEW_PROJECT_ID_RE);
  const matchedId = ownProjectMatch?.[1];
  const liveOwnProjectId =
    matchedId && matchedId !== "new" && matchedId !== GLOBAL_DEMO_PROJECT_ID ? matchedId : null;

  // Persisted across the "demo" stage's detour (the coach's own project id
  // isn't derivable from the URL once we've navigated away to look at the
  // demo project) and across reloads.
  const [savedOwnProjectId, setSavedOwnProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const saved = localStorage.getItem(ONBOARDING_OWN_PROJECT_KEY(user.id));
    if (saved) setSavedOwnProjectId(saved);
  }, [user?.id]);

  useEffect(() => {
    if (!liveOwnProjectId || liveOwnProjectId === savedOwnProjectId || !user?.id) return;
    setSavedOwnProjectId(liveOwnProjectId);
    localStorage.setItem(ONBOARDING_OWN_PROJECT_KEY(user.id), liveOwnProjectId);
  }, [liveOwnProjectId, savedOwnProjectId, user?.id]);

  const ownProjectPath = savedOwnProjectId ? `/projects/${savedOwnProjectId}` : null;
  const ownProjectSettingsPath = savedOwnProjectId ? `/projects/${savedOwnProjectId}/settings` : null;

  // Dedicated query (own key) so it can't collide with other components'
  // differently-shaped "my-teams" queries — just polls while we're waiting.
  const { data: hasActiveTeam } = useQuery({
    queryKey: ["onboarding-active-team", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("team_members")
        .select("teams(status)")
        .eq("user_id", user.id)
        .eq("status", "accepted");
      return (data ?? []).some(
        (m) => (m.teams as unknown as { status: string } | null)?.status === "active"
      );
    },
    enabled: !!user && stage === "team",
    refetchInterval: stage === "team" ? 1500 : false,
  });

  // Watches the coach's own newly-created project for its first timestamp.
  const { data: hasTimestamp } = useQuery({
    queryKey: ["onboarding-first-timestamp", liveOwnProjectId],
    queryFn: async () => {
      if (!liveOwnProjectId) return false;
      const { count } = await supabase
        .from("timestamps")
        .select("id", { count: "exact", head: true })
        .eq("project_id", liveOwnProjectId);
      return (count ?? 0) > 0;
    },
    enabled: stage === "timestamp" && !!liveOwnProjectId,
    refetchInterval: stage === "timestamp" ? 1500 : false,
  });

  // --- Stage: team -------------------------------------------------------
  useEffect(() => {
    if (stage === "team" && pathname !== "/team") {
      router.push("/team");
    }
  }, [stage, pathname, router]);

  useEffect(() => {
    if (stage === "team" && hasActiveTeam) {
      onStageChange("create_project");
      router.push("/dashboard");
    }
  }, [stage, hasActiveTeam, onStageChange, router]);

  // --- Stage: create_project (dashboard click -> form) --------------------
  // Route to the dashboard whenever we're in this stage and haven't created
  // the project yet — covers the normal transition in and a resume-after-
  // reload landing anywhere else.
  useEffect(() => {
    if (
      stage === "create_project" &&
      !liveOwnProjectId &&
      pathname !== "/dashboard" &&
      pathname !== "/projects/new"
    ) {
      router.push("/dashboard");
    }
  }, [stage, liveOwnProjectId, pathname, router]);

  useEffect(() => {
    if (stage === "create_project" && liveOwnProjectId) {
      onStageChange("timestamp");
    }
  }, [stage, liveOwnProjectId, onStageChange]);

  // --- Stage: timestamp ------------------------------------------------
  useEffect(() => {
    if (stage !== "timestamp" || !hasTimestamp) return;
    if (!demoProjectPath) {
      onStageChange("delete_project");
      return;
    }
    onStageChange("demo");
    router.push(demoProjectPath);
  }, [stage, hasTimestamp, demoProjectPath, onStageChange, router]);

  // --- Stage: demo (capstone) ----------------------------------------------
  useEffect(() => {
    if (stage === "demo" && demoProjectPath && pathname !== demoProjectPath) {
      router.push(demoProjectPath);
    }
  }, [stage, demoProjectPath, pathname, router]);

  // --- Stage: delete_project (back to own project -> settings -> delete) --
  // "/dashboard" is excluded here even though it's neither of the two
  // expected paths — it's where deleting the project lands, i.e. the
  // legitimate completion signal the effect below reacts to, not a "lost"
  // state to redirect back from.
  useEffect(() => {
    if (stage !== "delete_project" || !ownProjectPath || !ownProjectSettingsPath) return;
    if (pathname !== ownProjectPath && pathname !== ownProjectSettingsPath && pathname !== "/dashboard") {
      router.push(ownProjectPath);
    }
  }, [stage, ownProjectPath, ownProjectSettingsPath, pathname, router]);

  useEffect(() => {
    if (stage === "delete_project" && pathname === "/dashboard") {
      onStageChange("done");
      if (user?.id) localStorage.removeItem(ONBOARDING_OWN_PROJECT_KEY(user.id));
    }
  }, [stage, pathname, onStageChange, user?.id]);

  const handleEvent: EventHandler = useCallback(
    (data) => {
      if (typeof data.index === "number") setActiveIndex(data.index);
      if (data.status === STATUS.SKIPPED) {
        onStageChange("done");
        return;
      }
      if (data.status === STATUS.FINISHED && stage === "demo") {
        onStageChange("delete_project");
        if (ownProjectPath) router.push(ownProjectPath);
      }
    },
    [stage, onStageChange, ownProjectPath, router]
  );

  // Single source of truth for "what should render right now" — shared by
  // the Joyride instance below and the custom highlight effect.
  let activeConfig: ActiveTourConfig | null = null;
  if (stage === "team" && pathname === "/team") {
    activeConfig = { key: "team", steps: TEAM_STEPS, isAction: true };
  } else if (stage === "create_project" && pathname === "/dashboard") {
    activeConfig = { key: "create_project-dashboard", steps: DASHBOARD_NEW_PROJECT_STEPS, isAction: true };
  } else if (stage === "create_project" && pathname === "/projects/new") {
    activeConfig = { key: "create_project-form", steps: CREATE_PROJECT_STEPS, isAction: true };
  } else if (stage === "timestamp" && liveOwnProjectId) {
    activeConfig = { key: "timestamp", steps: TIMESTAMP_STEPS, isAction: true };
  } else if (stage === "demo" && demoProjectPath && pathname === demoProjectPath) {
    activeConfig = { key: "demo", steps: DEMO_STEPS, isAction: false };
  } else if (stage === "delete_project" && ownProjectPath && pathname === ownProjectPath) {
    activeConfig = { key: "delete_project-settings-link", steps: SETTINGS_LINK_STEPS, isAction: true };
  } else if (stage === "delete_project" && ownProjectSettingsPath && pathname === ownProjectSettingsPath) {
    activeConfig = { key: "delete_project-settings-page", steps: DELETE_PROJECT_STEPS, isAction: true };
  }

  const activeTarget = activeConfig?.steps[activeIndex]?.target;
  const activeTargetSelector = typeof activeTarget === "string" ? activeTarget : null;

  // Reset to the first step whenever we move to a different stage/page.
  useEffect(() => {
    setActiveIndex(0);
  }, [activeConfig?.key]);

  // Apply the visible highlight to whatever the current step targets. Polls
  // briefly in case the element hasn't mounted yet right after a navigation.
  useEffect(() => {
    if (!activeConfig?.isAction || !activeTargetSelector) return;
    let cancelled = false;
    let attempts = 0;
    let el: HTMLElement | null = null;

    const tryHighlight = () => {
      if (cancelled) return;
      el = document.querySelector<HTMLElement>(activeTargetSelector);
      if (el) {
        el.classList.add("onboarding-spotlight");
      } else if (attempts < 20) {
        attempts += 1;
        setTimeout(tryHighlight, 100);
      }
    };
    tryHighlight();

    return () => {
      cancelled = true;
      el?.classList.remove("onboarding-spotlight");
    };
  }, [activeConfig?.isAction, activeTargetSelector]);

  if (!activeConfig) return null;

  const options = activeConfig.isAction ? { ...JOYRIDE_OPTIONS, hideOverlay: true } : JOYRIDE_OPTIONS;

  return (
    <Joyride key={activeConfig.key} steps={activeConfig.steps} run continuous onEvent={handleEvent} options={options} />
  );
}

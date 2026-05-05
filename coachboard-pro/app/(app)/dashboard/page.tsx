"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useProjects } from "@/hooks/use-project";
import { useSubscription } from "@/hooks/use-subscription";
import { ProjectCard, ProjectListItem } from "@/components/dashboard/project-card";
import { UpgradeBanner } from "@/components/dashboard/upgrade-banner";
import { Button } from "@/components/ui/button";
import { Plus, Lock, LayoutGrid, List } from "lucide-react";
import { isAthlete } from "@/lib/permissions";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast";
import { FREE_LIMITS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [view, setView] = useState<"panel" | "list">("panel");
  const { data: projects, isLoading } = useProjects();
  const { canCreateProject, isPro } = useSubscription();
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();
  const athleteUser = isAthlete(profile);
  const projectCount = projects?.length ?? 0;

  // Check if any team the user belongs to has a Pro owner — inherits project creation rights
  const { data: anyProTeam } = useQuery({
    queryKey: ["any-pro-team", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data: memberships } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .eq("status", "accepted");
      if (!memberships?.length) return false;
      const teamIds = (memberships as { team_id: string }[]).map((m) => m.team_id);
      const { data: teams } = await supabase
        .from("teams")
        .select("created_by")
        .in("id", teamIds);
      if (!teams?.length) return false;
      const ownerIds = (teams as { created_by: string }[]).map((t) => t.created_by);
      const { data: owners } = await supabase
        .from("profiles")
        .select("subscription_status")
        .in("id", ownerIds);
      return (
        (owners as { subscription_status: string }[] | null)?.some(
          (o) => o.subscription_status === "pro" || o.subscription_status === "elite"
        ) ?? false
      );
    },
    enabled: !!user && !isAthlete(profile),
    staleTime: 60_000,
  });

  const atLimit = !canCreateProject(projectCount) && !anyProTeam;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">
            {athleteUser ? "My Sessions" : "Dashboard"}
          </h1>
          <p className="text-sm text-muted">
            {athleteUser
              ? "Sessions shared with you by your coaches"
              : "Your coaching projects"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!athleteUser && (
            atLimit ? (
              <Button
                variant="default"
                onClick={() => {
                  toast(`Free plan is limited to ${FREE_LIMITS.maxProjects} projects. Upgrade to Pro for unlimited.`, "error");
                  router.push("/settings/billing");
                }}
              >
                <Lock className="h-4 w-4" />
                New project (limit reached)
              </Button>
            ) : (
              <Link href="/projects/new">
                <Button variant="primary">
                  <Plus className="h-4 w-4" />
                  New project
                </Button>
              </Link>
            )
          )}
          <div className="flex rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setView("panel")}
              className={`flex items-center justify-center rounded-l-lg p-2 transition-colors ${
                view === "panel"
                  ? "bg-primary-bg text-text"
                  : "text-muted hover:text-text"
              }`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`flex items-center justify-center rounded-r-lg p-2 transition-colors ${
                view === "list"
                  ? "bg-primary-bg text-text"
                  : "text-muted hover:text-text"
              }`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <UpgradeBanner />

      {isLoading ? (
        view === "panel" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="aspect-[4/3] animate-pulse rounded-2xl bg-card"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-card"
              />
            ))}
          </div>
        )
      ) : !projects?.length ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card py-16">
          <p className="text-muted">
            {athleteUser
              ? "No sessions have been shared with you yet."
              : "No projects yet. Create your first one!"}
          </p>
          {!athleteUser && (
            <Link href="/projects/new">
              <Button variant="primary">
                <Plus className="h-4 w-4" />
                Create project
              </Button>
            </Link>
          )}
        </div>
      ) : view === "panel" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map((project) => (
            <ProjectListItem key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

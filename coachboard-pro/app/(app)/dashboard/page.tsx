"use client";

import Link from "next/link";
import { useProjects } from "@/hooks/use-project";
import { useSubscription } from "@/hooks/use-subscription";
import { ProjectCard } from "@/components/dashboard/project-card";
import { UpgradeBanner } from "@/components/dashboard/upgrade-banner";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { isAthlete } from "@/lib/permissions";
import { useAuth } from "@/components/auth/auth-provider";

export default function DashboardPage() {
  const { data: projects, isLoading } = useProjects();
  const { canCreateProject } = useSubscription();
  const { profile } = useAuth();
  const athleteUser = isAthlete(profile);

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
        {!athleteUser && (
          <Link href="/projects/new">
            <Button
              variant="primary"
              disabled={!canCreateProject(projects?.length ?? 0)}
            >
              <Plus className="h-4 w-4" />
              New project
            </Button>
          </Link>
        )}
      </div>

      <UpgradeBanner />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-[4/3] animate-pulse rounded-2xl bg-card"
            />
          ))}
        </div>
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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

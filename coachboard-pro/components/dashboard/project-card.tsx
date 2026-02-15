"use client";

import Link from "next/link";
import type { Project } from "@/lib/supabase/types";
import { Film } from "lucide-react";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary-br"
    >
      <div className="flex aspect-video items-center justify-center rounded-xl bg-bg">
        {project.youtube_id ? (
          <img
            src={`https://img.youtube.com/vi/${project.youtube_id}/mqdefault.jpg`}
            alt={project.title}
            className="h-full w-full rounded-xl object-cover"
          />
        ) : (
          <Film className="h-8 w-8 text-muted" />
        )}
      </div>
      <div>
        <h3 className="font-bold group-hover:text-primary transition-colors">
          {project.title}
        </h3>
        {project.description && (
          <p className="mt-1 text-xs text-muted line-clamp-2">
            {project.description}
          </p>
        )}
        <p className="mt-2 text-xs text-muted">
          {new Date(project.updated_at).toLocaleDateString()}
        </p>
      </div>
    </Link>
  );
}

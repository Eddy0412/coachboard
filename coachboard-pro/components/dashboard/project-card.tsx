"use client";

import Link from "next/link";
import type { Project } from "@/lib/supabase/types";
import { Film } from "lucide-react";

const CATEGORY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  game: { bg: "bg-blue-500", text: "text-white", label: "Game" },
  practice: { bg: "bg-amber-500", text: "text-white", label: "Practice" },
};

export function ProjectCard({ project }: { project: Project }) {
  const cat = CATEGORY_STYLES[project.category] ?? CATEGORY_STYLES.game;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary-br"
    >
      <div className="relative flex aspect-video items-center justify-center rounded-xl bg-bg">
        {project.youtube_id ? (
          <img
            src={`https://img.youtube.com/vi/${project.youtube_id}/mqdefault.jpg`}
            alt={project.title}
            className="h-full w-full rounded-xl object-cover"
          />
        ) : (
          <Film className="h-8 w-8 text-muted" />
        )}
        <span
          className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cat.bg} ${cat.text}`}
        >
          {cat.label}
        </span>
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

export function ProjectListItem({ project }: { project: Project }) {
  const cat = CATEGORY_STYLES[project.category] ?? CATEGORY_STYLES.game;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary-br"
    >
      <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-bg">
        {project.youtube_id ? (
          <img
            src={`https://img.youtube.com/vi/${project.youtube_id}/mqdefault.jpg`}
            alt={project.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Film className="h-5 w-5 text-muted" />
          </div>
        )}
      </div>
      <span
        className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cat.bg} ${cat.text}`}
      >
        {cat.label}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-bold group-hover:text-primary transition-colors">
          {project.title}
        </h3>
        {project.description && (
          <p className="truncate text-xs text-muted">
            {project.description}
          </p>
        )}
      </div>
      <p className="shrink-0 text-xs text-muted">
        {new Date(project.updated_at).toLocaleDateString()}
      </p>
    </Link>
  );
}

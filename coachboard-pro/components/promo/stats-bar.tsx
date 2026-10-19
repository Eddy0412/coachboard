"use client";

import { useQuery } from "@tanstack/react-query";

interface PromoStats {
  totalUsers: number;
  totalTeams: number;
  totalProjects: number;
  totalClips: number;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k+`;
  return `${n}`;
}

export function PromoStatsBar() {
  const { data } = useQuery<PromoStats>({
    queryKey: ["promo-stats"],
    queryFn: async () => {
      const res = await fetch("/api/public/promo-stats");
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
  });

  const stats = [
    { label: "Coaches", value: data ? formatCount(data.totalUsers) : "—" },
    { label: "Teams", value: data ? formatCount(data.totalTeams) : "—" },
    { label: "Projects broken down", value: data ? formatCount(data.totalProjects) : "—" },
    { label: "Coaching points tagged", value: data ? formatCount(data.totalClips) : "—" },
  ];

  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-2 gap-6 px-6 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col items-center text-center">
          <span className="text-3xl font-extrabold text-primary">{s.value}</span>
          <span className="text-xs text-muted">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

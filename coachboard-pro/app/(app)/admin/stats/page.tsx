"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GrowthChart } from "@/components/admin/growth-chart";
import { cn, formatCompact, formatUsd } from "@/lib/utils";
import { Users, ShieldCheck, Film, Tag, Crown } from "lucide-react";

type StatsResponse = {
  range: number;
  overview: {
    totalUsers: number;
    totalTeams: number;
    totalProjects: number;
    totalClips: number;
    proSubscribers: number;
  };
  growth: Record<
    "signups" | "teamsCreated" | "projectsCreated" | "clipsCreated",
    { series: { date: string; value: number }[]; current: number; previous: number; deltaPct: number | null }
  >;
  engagement: { dau: number; wau: number; mau: number };
  subscriptions: { free: number; pro: number; canceled: number };
  invitations: { pending: number; accepted: number; expired: number };
  mostActiveTeams: { name: string; count: number }[];
  apiUsage: {
    totalCostUsd: number;
    totalCalls: number;
    byUser: { name: string; calls: number; inputTokens: number; outputTokens: number; costUsd: number }[];
  };
};

const RANGES = [7, 30, 90] as const;

const OVERVIEW_CARDS = [
  { key: "totalUsers", label: "Total users", icon: Users },
  { key: "totalTeams", label: "Total teams", icon: ShieldCheck },
  { key: "totalProjects", label: "Film uploaded", icon: Film },
  { key: "totalClips", label: "Clips logged", icon: Tag },
  { key: "proSubscribers", label: "Pro subscribers", icon: Crown },
] as const;

const GROWTH_CARDS = [
  { key: "signups", label: "New signups", color: "var(--color-primary)" },
  { key: "teamsCreated", label: "Teams created", color: "var(--color-cyan)" },
  { key: "projectsCreated", label: "Film uploaded", color: "var(--color-success)" },
  { key: "clipsCreated", label: "Clips logged", color: "var(--color-warning)" },
] as const;

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-muted">no prior data</span>;
  const rounded = Math.round(pct * 10) / 10;
  const isFlat = rounded === 0;
  return (
    <span
      className={cn(
        "text-xs font-semibold tabular-nums",
        isFlat ? "text-muted" : rounded > 0 ? "text-success" : "text-danger"
      )}
    >
      {isFlat ? "±0%" : `${rounded > 0 ? "+" : ""}${rounded}%`} vs prior period
    </span>
  );
}

export default function AdminStatsPage() {
  const { profile } = useAuth();
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-stats", range],
    queryFn: async () => {
      const res = await fetch(`/api/admin/stats?range=${range}`);
      if (!res.ok) throw new Error("Failed to load stats");
      return (await res.json()) as StatsResponse;
    },
    enabled: !!profile?.is_staff,
  });

  if (!profile?.is_staff) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold">Stats</h1>
        <p className="text-muted">Staff access required.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Stats</h1>
          <p className="text-sm text-muted">Growth and usage across every team on Coachboard Pro</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-input p-1">
          {RANGES.map((r) => (
            <Button
              key={r}
              variant={range === r ? "primary" : "ghost"}
              size="sm"
              onClick={() => setRange(r)}
            >
              {r}d
            </Button>
          ))}
        </div>
      </div>

      {isError && <p className="text-sm text-danger">Couldn&apos;t load stats. Try refreshing.</p>}

      {/* Overview: all-time totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {OVERVIEW_CARDS.map(({ key, label, icon: Icon }) => (
          <Card key={key} className="flex flex-col gap-2 p-4">
            <div className="flex items-center gap-2 text-muted">
              <Icon className="h-4 w-4" />
              <span className="text-xs">{label}</span>
            </div>
            <div className="text-2xl font-semibold tabular-nums">
              {isLoading ? "—" : formatCompact(data?.overview[key] ?? 0)}
            </div>
          </Card>
        ))}
      </div>

      {/* Growth charts */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {GROWTH_CARDS.map(({ key, label, color }) => {
          const metric = data?.growth[key];
          return (
            <Card key={key} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-muted">{label}</p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {isLoading ? "—" : formatCompact(metric?.current ?? 0)}
                  </p>
                </div>
                {!isLoading && metric && <DeltaBadge pct={metric.deltaPct} />}
              </div>
              {!isLoading && metric && <GrowthChart data={metric.series} color={color} />}
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Engagement */}
        <Card className="flex flex-col gap-3 p-4">
          <p className="text-sm font-semibold">Active coaches &amp; athletes</p>
          <p className="text-xs text-muted">By last sign-in</p>
          <div className="flex flex-col gap-2">
            {([
              ["Daily", data?.engagement.dau],
              ["Weekly", data?.engagement.wau],
              ["Monthly", data?.engagement.mau],
            ] as const).map(([label, value]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-muted">{label} active</span>
                <span className="font-semibold tabular-nums">{isLoading ? "—" : formatCompact(value ?? 0)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Subscriptions */}
        <Card className="flex flex-col gap-3 p-4">
          <p className="text-sm font-semibold">Subscriptions</p>
          {data && (
            <>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-pill">
                {(["free", "pro", "canceled"] as const).map((s) => {
                  const total = data.subscriptions.free + data.subscriptions.pro + data.subscriptions.canceled || 1;
                  const pct = (data.subscriptions[s] / total) * 100;
                  const bg = s === "pro" ? "var(--color-primary)" : s === "canceled" ? "var(--color-danger)" : "var(--color-muted)";
                  return pct > 0 ? (
                    <div key={s} style={{ width: `${pct}%`, backgroundColor: bg, marginRight: 2 }} />
                  ) : null;
                })}
              </div>
              <div className="flex flex-col gap-2 text-sm">
                {(["pro", "free", "canceled"] as const).map((s) => (
                  <div key={s} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted capitalize">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            s === "pro" ? "var(--color-primary)" : s === "canceled" ? "var(--color-danger)" : "var(--color-muted)",
                        }}
                      />
                      {s}
                    </span>
                    <span className="font-semibold tabular-nums">{formatCompact(data.subscriptions[s])}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Invitation funnel */}
        <Card className="flex flex-col gap-3 p-4">
          <p className="text-sm font-semibold">Invitations</p>
          {data && (
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Pending</span>
                <span className="font-semibold tabular-nums">{formatCompact(data.invitations.pending)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Accepted</span>
                <span className="font-semibold tabular-nums">{formatCompact(data.invitations.accepted)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Expired</span>
                <span className="font-semibold tabular-nums">{formatCompact(data.invitations.expired)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
                <span className="text-muted">Acceptance rate</span>
                <span className="font-semibold tabular-nums">
                  {(() => {
                    const total = data.invitations.pending + data.invitations.accepted + data.invitations.expired;
                    if (total === 0) return "—";
                    return `${Math.round((data.invitations.accepted / total) * 100)}%`;
                  })()}
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* API usage / fund spend per pro user */}
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">CoachIQ API usage</p>
            <p className="text-xs text-muted">Anthropic spend by pro user, selected period</p>
          </div>
          {data && (
            <div className="text-right">
              <p className="text-xl font-semibold tabular-nums">{formatUsd(data.apiUsage.totalCostUsd)}</p>
              <p className="text-xs text-muted">{formatCompact(data.apiUsage.totalCalls)} reports generated</p>
            </div>
          )}
        </div>
        {data && data.apiUsage.byUser.length === 0 && (
          <p className="text-sm text-muted">No CoachIQ reports generated in this period yet.</p>
        )}
        {data && data.apiUsage.byUser.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="py-2 pr-3 font-medium">User</th>
                  <th className="py-2 pr-3 font-medium">Reports</th>
                  <th className="py-2 pr-3 font-medium">Input tokens</th>
                  <th className="py-2 pr-3 font-medium">Output tokens</th>
                  <th className="py-2 pl-3 text-right font-medium">Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {data.apiUsage.byUser.map((u) => (
                  <tr key={u.name} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-3">{u.name}</td>
                    <td className="py-2 pr-3 tabular-nums">{u.calls}</td>
                    <td className="py-2 pr-3 tabular-nums text-muted">{formatCompact(u.inputTokens)}</td>
                    <td className="py-2 pr-3 tabular-nums text-muted">{formatCompact(u.outputTokens)}</td>
                    <td className="py-2 pl-3 text-right font-semibold tabular-nums">{formatUsd(u.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Most active teams */}
      <Card className="flex flex-col gap-3 p-4">
        <div>
          <p className="text-sm font-semibold">Most active teams</p>
          <p className="text-xs text-muted">By film uploaded in the selected period</p>
        </div>
        {data && data.mostActiveTeams.length === 0 && (
          <p className="text-sm text-muted">No film uploaded in this period yet.</p>
        )}
        {data && data.mostActiveTeams.length > 0 && (
          <div className="flex flex-col gap-2">
            {data.mostActiveTeams.map((t, i) => (
              <div key={t.name + i} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                <span className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pill text-xs text-muted">
                    {i + 1}
                  </span>
                  {t.name}
                </span>
                <span className="font-semibold tabular-nums">{t.count} uploads</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

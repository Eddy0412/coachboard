import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type Series = { date: string; value: number }[];

function utcDayKey(iso: string) {
  return iso.slice(0, 10);
}

function emptyDayMap(start: Date, days: number) {
  const map = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  return map;
}

function bucketSeries(rows: { created_at: string }[], start: Date, days: number): Series {
  const map = emptyDayMap(start, days);
  for (const r of rows) {
    const key = utcDayKey(r.created_at);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([date, value]) => ({ date, value }));
}

function splitPeriods(rows: { created_at: string }[], previousStart: Date, currentStart: Date) {
  let previous = 0;
  let current = 0;
  for (const r of rows) {
    const t = new Date(r.created_at).getTime();
    if (t >= currentStart.getTime()) current++;
    else if (t >= previousStart.getTime()) previous++;
  }
  return { current, previous };
}

function deltaPct(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export async function GET(request: NextRequest) {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: callerProfile } = await authClient
    .from("profiles")
    .select("is_staff")
    .eq("id", user.id)
    .single();
  if (!callerProfile?.is_staff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const requestedRange = Number(searchParams.get("range") ?? 30);
  const days = [7, 30, 90].includes(requestedRange) ? requestedRange : 30;

  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setUTCDate(currentStart.getUTCDate() - (days - 1));
  currentStart.setUTCHours(0, 0, 0, 0);
  const previousStart = new Date(currentStart);
  previousStart.setUTCDate(previousStart.getUTCDate() - days);

  const supabase = getSupabaseAdmin();

  const [
    signupsRes,
    teamsRes,
    projectsRes,
    clipsRes,
    totalUsersRes,
    totalTeamsRes,
    totalProjectsRes,
    totalClipsRes,
    freeRes,
    proRes,
    canceledRes,
    invPendingRes,
    invAcceptedRes,
    invExpiredRes,
    topTeamsRes,
    apiUsageRes,
  ] = await Promise.all([
    supabase.from("profiles").select("created_at").gte("created_at", previousStart.toISOString()),
    supabase.from("teams").select("created_at").gte("created_at", previousStart.toISOString()),
    supabase.from("projects").select("created_at").gte("created_at", previousStart.toISOString()),
    supabase.from("timestamps").select("created_at").gte("created_at", previousStart.toISOString()),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("teams").select("id", { count: "exact", head: true }),
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase.from("timestamps").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("subscription_status", "free"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("subscription_status", "pro"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("subscription_status", "canceled"),
    supabase.from("invitations").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("invitations").select("id", { count: "exact", head: true }).eq("status", "accepted"),
    supabase.from("invitations").select("id", { count: "exact", head: true }).eq("status", "expired"),
    supabase
      .from("projects")
      .select("team_id, teams(name)")
      .gte("created_at", currentStart.toISOString()),
    supabase
      .from("api_usage_log")
      .select("user_id, input_tokens, output_tokens, estimated_cost_usd, profiles(full_name, email)")
      .gte("created_at", currentStart.toISOString()),
  ]);

  // auth.users isn't in the public schema — listUsers is the only way to read
  // last_sign_in_at, and it's capped at 1000/page, fine at this app's scale.
  const { data: authUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const nowMs = now.getTime();
  const DAY = 24 * 60 * 60 * 1000;
  let dau = 0;
  let wau = 0;
  let mau = 0;
  for (const u of authUsers?.users ?? []) {
    if (!u.last_sign_in_at) continue;
    const since = nowMs - new Date(u.last_sign_in_at).getTime();
    if (since <= DAY) dau++;
    if (since <= 7 * DAY) wau++;
    if (since <= 30 * DAY) mau++;
  }

  const signups = signupsRes.data ?? [];
  const teamsCreated = teamsRes.data ?? [];
  const projectsCreated = projectsRes.data ?? [];
  const clipsCreated = clipsRes.data ?? [];

  const teamCounts = new Map<string, { name: string; count: number }>();
  for (const row of topTeamsRes.data ?? []) {
    const team = row.teams as unknown as { name: string } | null;
    if (!row.team_id || !team) continue;
    const existing = teamCounts.get(row.team_id);
    if (existing) existing.count++;
    else teamCounts.set(row.team_id, { name: team.name, count: 1 });
  }
  const mostActiveTeams = Array.from(teamCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const usageByUser = new Map<
    string,
    { name: string; calls: number; inputTokens: number; outputTokens: number; costUsd: number }
  >();
  let totalApiCostUsd = 0;
  for (const row of apiUsageRes.data ?? []) {
    const profile = row.profiles as unknown as { full_name?: string; email?: string } | null;
    const name = profile?.full_name || profile?.email || "Unknown user";
    const existing = usageByUser.get(row.user_id);
    const cost = Number(row.estimated_cost_usd) || 0;
    totalApiCostUsd += cost;
    if (existing) {
      existing.calls++;
      existing.inputTokens += row.input_tokens;
      existing.outputTokens += row.output_tokens;
      existing.costUsd += cost;
    } else {
      usageByUser.set(row.user_id, {
        name,
        calls: 1,
        inputTokens: row.input_tokens,
        outputTokens: row.output_tokens,
        costUsd: cost,
      });
    }
  }
  const apiUsageByUser = Array.from(usageByUser.values()).sort((a, b) => b.costUsd - a.costUsd);

  const metric = (rows: { created_at: string }[]) => {
    const { current, previous } = splitPeriods(rows, previousStart, currentStart);
    return {
      series: bucketSeries(rows.filter((r) => new Date(r.created_at).getTime() >= currentStart.getTime()), currentStart, days),
      current,
      previous,
      deltaPct: deltaPct(current, previous),
    };
  };

  return NextResponse.json({
    range: days,
    overview: {
      totalUsers: totalUsersRes.count ?? 0,
      totalTeams: totalTeamsRes.count ?? 0,
      totalProjects: totalProjectsRes.count ?? 0,
      totalClips: totalClipsRes.count ?? 0,
      proSubscribers: proRes.count ?? 0,
    },
    growth: {
      signups: metric(signups),
      teamsCreated: metric(teamsCreated),
      projectsCreated: metric(projectsCreated),
      clipsCreated: metric(clipsCreated),
    },
    engagement: { dau, wau, mau },
    subscriptions: {
      free: freeRes.count ?? 0,
      pro: proRes.count ?? 0,
      canceled: canceledRes.count ?? 0,
    },
    invitations: {
      pending: invPendingRes.count ?? 0,
      accepted: invAcceptedRes.count ?? 0,
      expired: invExpiredRes.count ?? 0,
    },
    mostActiveTeams,
    apiUsage: {
      totalCostUsd: totalApiCostUsd,
      totalCalls: apiUsageRes.data?.length ?? 0,
      byUser: apiUsageByUser,
    },
  });
}

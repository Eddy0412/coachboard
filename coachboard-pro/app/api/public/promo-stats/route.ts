import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Public, unauthenticated — only aggregate, non-sensitive counts.
// Recomputed independently from the staff-only /api/admin/stats route,
// which also returns PII and revenue data that must never be exposed here.
export async function GET() {
  const supabase = getSupabaseAdmin();

  const [totalUsersRes, totalTeamsRes, totalProjectsRes, totalClipsRes] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("teams").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("timestamps").select("id", { count: "exact", head: true }),
    ]);

  return NextResponse.json({
    totalUsers: totalUsersRes.count ?? 0,
    totalTeams: totalTeamsRes.count ?? 0,
    totalProjects: totalProjectsRes.count ?? 0,
    totalClips: totalClipsRes.count ?? 0,
  });
}

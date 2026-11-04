// One-time script: clones a curated set of real timestamps/drawings from the
// user's live "AGUILAS vs EAGLES" project into a dedicated, untouchable
// "Coachboard Demo" team/project owned by a new system account, flagged
// is_global_demo so RLS (see 20261104_001_global_demo_project.sql) lets any
// signed-in user view it read-only. Not application code — run once with the
// service-role key, then delete/ignore.
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const SOURCE_PROJECT_ID = "f87e4c1b-a834-4b6e-a949-b224aa92b25a";
const SELECTED_SORT_ORDERS = [1, 2, 3, 4, 8, 9, 51, 52];
const DEMO_ACCOUNT_EMAIL = "coachboard-demo@kkmsports.xyz";

async function main() {
  const { data: source, error: srcErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", SOURCE_PROJECT_ID)
    .single();
  if (srcErr) throw srcErr;

  const { data: sourceTimestamps, error: tsErr } = await supabase
    .from("timestamps")
    .select("*")
    .eq("project_id", SOURCE_PROJECT_ID)
    .in("sort_order", SELECTED_SORT_ORDERS)
    .order("sort_order");
  if (tsErr) throw tsErr;
  if (sourceTimestamps.length !== SELECTED_SORT_ORDERS.length) {
    throw new Error(`Expected ${SELECTED_SORT_ORDERS.length} timestamps, got ${sourceTimestamps.length}`);
  }

  const sourceIds = sourceTimestamps.map((t) => t.id);
  const { data: sourceDrawings, error: drErr } = await supabase
    .from("drawings")
    .select("*")
    .in("timestamp_id", sourceIds)
    .order("sort_order");
  if (drErr) throw drErr;

  // 1. Dedicated system account (idempotent: reuse if it already exists)
  let demoUserId;
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers.users.find((u) => u.email === DEMO_ACCOUNT_EMAIL);
  if (existing) {
    demoUserId = existing.id;
    console.log("Reusing existing demo account:", demoUserId);
  } else {
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();
    const { data: created, error: userErr } = await supabase.auth.admin.createUser({
      email: DEMO_ACCOUNT_EMAIL,
      password: randomPassword,
      email_confirm: true,
      user_metadata: { full_name: "Coachboard Demo", default_role: "coach" },
    });
    if (userErr) throw userErr;
    demoUserId = created.user.id;
    console.log("Created demo account:", demoUserId);
  }

  // 2. Dedicated team (idempotent: reuse if already created by this account)
  let teamId;
  const { data: existingTeams } = await supabase
    .from("teams")
    .select("id")
    .eq("created_by", demoUserId)
    .eq("name", "Coachboard Demo")
    .limit(1);
  if (existingTeams?.length) {
    teamId = existingTeams[0].id;
    console.log("Reusing existing demo team:", teamId);
  } else {
    const { data: team, error: teamErr } = await supabase
      .from("teams")
      .insert({ name: "Coachboard Demo", created_by: demoUserId, status: "active" })
      .select()
      .single();
    if (teamErr) throw teamErr;
    teamId = team.id;
    await supabase.from("team_members").insert({
      team_id: teamId,
      user_id: demoUserId,
      role: "head_coach",
      invited_by: demoUserId,
      status: "accepted",
    });
    console.log("Created demo team:", teamId);
  }

  // 3. Cloned project (idempotent: reuse if already cloned)
  let projectId;
  const { data: existingProject } = await supabase
    .from("projects")
    .select("id")
    .eq("team_id", teamId)
    .eq("is_global_demo", true)
    .limit(1);
  if (existingProject?.length) {
    projectId = existingProject[0].id;
    console.log("Reusing existing demo project:", projectId);
  } else {
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .insert({
        team_id: teamId,
        title: source.title,
        description: source.description,
        youtube_url: source.youtube_url,
        youtube_id: source.youtube_id,
        category: source.category,
        created_by: demoUserId,
        coachiq_report: source.coachiq_report,
        coachiq_report_visibility: "team",
        coachiq_report_generated_at: source.coachiq_report_generated_at,
        is_global_demo: true,
      })
      .select()
      .single();
    if (projErr) throw projErr;
    projectId = project.id;
    await supabase.from("project_access").insert({
      project_id: projectId,
      user_id: demoUserId,
      permission: "admin",
      granted_by: demoUserId,
    });
    console.log("Created demo project:", projectId);

    // 4. Cloned timestamps, preserving relative sort order
    const idMap = {};
    for (const t of sourceTimestamps) {
      const { data: newTs, error: newTsErr } = await supabase
        .from("timestamps")
        .insert({
          project_id: projectId,
          time_seconds: t.time_seconds,
          end_time_seconds: t.end_time_seconds,
          title: t.title,
          description: t.description,
          overlay_show_sec: t.overlay_show_sec,
          odk: t.odk,
          down: t.down,
          distance: t.distance,
          los: t.los,
          hash: t.hash,
          action: t.action,
          target_x: t.target_x,
          target_y: t.target_y,
          pass_result: t.pass_result,
          sort_order: t.sort_order,
          created_by: demoUserId,
        })
        .select()
        .single();
      if (newTsErr) throw newTsErr;
      idMap[t.id] = newTs.id;
    }
    console.log("Cloned", sourceTimestamps.length, "timestamps");

    // 5. Cloned drawings, remapped to the new timestamp ids
    if (sourceDrawings.length) {
      const newDrawings = sourceDrawings.map((d) => ({
        timestamp_id: idMap[d.timestamp_id],
        tool: d.tool,
        color: d.color,
        size: d.size,
        points: d.points,
        sort_order: d.sort_order,
        created_by: demoUserId,
      }));
      const { error: drawInsertErr } = await supabase.from("drawings").insert(newDrawings);
      if (drawInsertErr) throw drawInsertErr;
      console.log("Cloned", newDrawings.length, "drawings");
    }
  }

  console.log("\nDone. Set lib/onboarding.ts GLOBAL_DEMO_PROJECT_ID to:", projectId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

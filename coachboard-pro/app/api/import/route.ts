import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

interface V1State {
  projectId?: number;
  youtubeUrl?: string;
  youtubeId?: string;
  roster?: {
    id: number;
    first: string;
    last: string;
    position: string;
    jersey: string;
    team?: string;
  }[];
  timestamps?: {
    id: number;
    time: number;
    title: string;
    description: string;
    taggedAthleteIds?: number[];
    drawings?: {
      id: number;
      tool: string;
      color: string;
      size: number;
      points: { x: number; y: number }[];
    }[];
    overlayShowSec?: number;
    endTime?: number | null;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: V1State & { team_id: string } = await request.json();
    const { team_id } = body;

    if (!team_id) {
      return NextResponse.json(
        { error: "team_id is required" },
        { status: 400 }
      );
    }

    // Create project
    const { data: project, error: projectErr } = await supabase
      .from("projects")
      .insert({
        team_id,
        title: `Imported Project ${body.projectId || ""}`.trim(),
        youtube_url: body.youtubeUrl || "",
        youtube_id: body.youtubeId || "",
        created_by: user.id,
      })
      .select()
      .single();

    if (projectErr) throw projectErr;

    // Give creator admin access
    await supabase.from("project_access").insert({
      project_id: project.id,
      user_id: user.id,
      permission: "admin",
      granted_by: user.id,
    });

    // Import roster (create athletes)
    const athleteIdMap = new Map<number, string>(); // v1 id -> new uuid
    if (body.roster?.length) {
      for (const a of body.roster) {
        const { data: athlete } = await supabase
          .from("athletes")
          .insert({
            team_id,
            first_name: a.first || "",
            last_name: a.last || "",
            position: a.position || "",
            jersey_number: a.jersey || "",
            created_by: user.id,
          })
          .select()
          .single();

        if (athlete) {
          athleteIdMap.set(a.id, athlete.id);
        }
      }
    }

    // Import timestamps
    if (body.timestamps?.length) {
      for (let i = 0; i < body.timestamps.length; i++) {
        const ts = body.timestamps[i];
        const { data: timestamp } = await supabase
          .from("timestamps")
          .insert({
            project_id: project.id,
            time_seconds: ts.time || 0,
            end_time_seconds: ts.endTime ?? null,
            title: ts.title || "Untitled",
            description: ts.description || "",
            overlay_show_sec: ts.overlayShowSec ?? 5,
            sort_order: i,
            created_by: user.id,
          })
          .select()
          .single();

        if (!timestamp) continue;

        // Import tagged athletes
        if (ts.taggedAthleteIds?.length) {
          const tags = ts.taggedAthleteIds
            .map((oldId) => athleteIdMap.get(oldId))
            .filter(Boolean)
            .map((newId) => ({
              timestamp_id: timestamp.id,
              athlete_id: newId!,
            }));
          if (tags.length) {
            await supabase.from("timestamp_athletes").insert(tags);
          }
        }

        // Import drawings
        if (ts.drawings?.length) {
          for (let j = 0; j < ts.drawings.length; j++) {
            const d = ts.drawings[j];
            await supabase.from("drawings").insert({
              timestamp_id: timestamp.id,
              tool: (d.tool === "erase" ? "erase" : "pen") as "pen" | "erase",
              color: d.color || "#00E5FF",
              size: d.size || 4,
              points: d.points || [],
              sort_order: j,
              created_by: user.id,
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      project_id: project.id,
      athletes_imported: athleteIdMap.size,
      timestamps_imported: body.timestamps?.length ?? 0,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Import failed" },
      { status: 500 }
    );
  }
}

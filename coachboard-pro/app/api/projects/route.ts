import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST — create a project on behalf of a team (for footage admin / support accounts)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      youtubeUrl,
      youtubeId,
      teamId,
      category,
      createdBy,
    } = body as {
      title: string;
      description?: string;
      youtubeUrl: string;
      youtubeId: string;
      teamId: string;
      category?: string;
      createdBy: string;
    };

    if (!title || !youtubeUrl || !youtubeId || !teamId || !createdBy) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Verify the team exists
    const { data: team, error: teamErr } = await supabase
      .from("teams")
      .select("id, name")
      .eq("id", teamId)
      .single();

    if (teamErr || !team) {
      return NextResponse.json(
        { error: "Team not found. Check the Team ID and try again." },
        { status: 404 }
      );
    }

    // Create the project using service role (bypasses RLS)
    const { data: project, error: projectErr } = await supabase
      .from("projects")
      .insert({
        title,
        description: description || null,
        youtube_url: youtubeUrl,
        youtube_id: youtubeId,
        team_id: teamId,
        category: category || "game",
        created_by: createdBy,
      })
      .select()
      .single();

    if (projectErr) throw projectErr;

    // Give the creator admin access
    await supabase.from("project_access").insert({
      project_id: project.id,
      user_id: createdBy,
      permission: "admin",
      granted_by: createdBy,
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("Admin project creation error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}

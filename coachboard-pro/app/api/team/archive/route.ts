import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId } = await request.json();
    if (!teamId) {
      return NextResponse.json({ error: "teamId is required" }, { status: 400 });
    }

    const { data: membership } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .eq("status", "accepted")
      .single();

    if (membership?.role !== "head_coach") {
      return NextResponse.json({ error: "Only the head coach can archive this team" }, { status: 403 });
    }

    const { count } = await supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("status", "accepted")
      .neq("user_id", user.id);

    if (count && count > 0) {
      return NextResponse.json(
        { error: "Transfer the head coach role before archiving", code: "TRANSFER_REQUIRED" },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from("teams")
      .update({ status: "archived", archived_at: new Date().toISOString() })
      .eq("id", teamId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Archive team error:", error);
    return NextResponse.json({ error: "Failed to archive team" }, { status: 500 });
  }
}

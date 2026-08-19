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

    const { data: membership, error: membershipErr } = await supabase
      .from("team_members")
      .select("id, role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .eq("status", "accepted")
      .single();

    if (membershipErr || !membership) {
      return NextResponse.json({ error: "You're not a member of this team" }, { status: 404 });
    }

    if (membership.role === "head_coach") {
      const { count } = await supabase
        .from("team_members")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("status", "accepted")
        .neq("user_id", user.id);

      if (count && count > 0) {
        return NextResponse.json(
          { error: "Transfer the head coach role before leaving", code: "TRANSFER_REQUIRED" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "You're the only member — archive or delete the team instead", code: "SOLE_HEAD_COACH" },
        { status: 409 }
      );
    }

    const { error: deleteErr } = await supabase
      .from("team_members")
      .delete()
      .eq("id", membership.id);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Leave team error:", error);
    return NextResponse.json({ error: "Failed to leave team" }, { status: 500 });
  }
}

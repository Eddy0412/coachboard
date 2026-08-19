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

    const { teamId, newHeadCoachUserId } = await request.json();
    if (!teamId || !newHeadCoachUserId) {
      return NextResponse.json(
        { error: "teamId and newHeadCoachUserId are required" },
        { status: 400 }
      );
    }

    const { error } = await supabase.rpc("transfer_head_coach_and_leave", {
      p_team_id: teamId,
      p_new_head_coach_user_id: newHeadCoachUserId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Transfer head coach error:", error);
    return NextResponse.json({ error: "Failed to transfer head coach role" }, { status: 500 });
  }
}

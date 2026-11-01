import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { data: existingVote } = await supabase
      .from("feedback_votes")
      .select("item_id")
      .eq("item_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingVote) {
      const { error } = await supabase
        .from("feedback_votes")
        .delete()
        .eq("item_id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("feedback_votes")
        .insert({ item_id: id, user_id: user.id });
      if (error) throw error;
    }

    const { count } = await supabase
      .from("feedback_votes")
      .select("item_id", { count: "exact", head: true })
      .eq("item_id", id);

    return NextResponse.json({ voted: !existingVote, voteCount: count ?? 0 });
  } catch (error) {
    console.error("Toggle feedback vote error:", error);
    return NextResponse.json({ error: "Failed to update vote" }, { status: 500 });
  }
}

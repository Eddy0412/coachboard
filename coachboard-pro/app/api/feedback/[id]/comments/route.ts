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
    const { body } = await request.json();
    if (!body?.trim()) {
      return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
    }

    const { data: comment, error } = await supabase
      .from("feedback_comments")
      .insert({ item_id: id, author_id: user.id, body: body.trim() })
      .select("*, author:profiles!feedback_comments_author_id_fkey(id, full_name)")
      .single();

    if (error) throw error;

    return NextResponse.json({ comment });
  } catch (error) {
    console.error("Add feedback comment error:", error);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}

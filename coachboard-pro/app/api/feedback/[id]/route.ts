import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { FeedbackPriority, FeedbackStatus } from "@/lib/supabase/types";

export async function GET(
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

    const { data: item, error } = await supabase
      .from("feedback_items")
      .select(
        `*, author:profiles!feedback_items_author_id_fkey(id, full_name),
         feedback_attachments(id, url),
         feedback_votes(count)`
      )
      .eq("id", id)
      .single();

    if (error || !item) {
      return NextResponse.json({ error: "Feedback item not found" }, { status: 404 });
    }

    const { data: comments } = await supabase
      .from("feedback_comments")
      .select("*, author:profiles!feedback_comments_author_id_fkey(id, full_name)")
      .eq("item_id", id)
      .order("created_at", { ascending: true });

    const { data: myVote } = await supabase
      .from("feedback_votes")
      .select("item_id")
      .eq("item_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      item: {
        ...item,
        voteCount: item.feedback_votes?.[0]?.count ?? 0,
        votedByMe: !!myVote,
        feedback_votes: undefined,
        attachments: item.feedback_attachments ?? [],
        feedback_attachments: undefined,
      },
      comments: comments ?? [],
    });
  } catch (error) {
    console.error("Get feedback item error:", error);
    return NextResponse.json({ error: "Failed to load feedback item" }, { status: 500 });
  }
}

export async function PATCH(
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_staff")
      .eq("id", user.id)
      .single();
    if (!profile?.is_staff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, priority } = body as {
      status?: FeedbackStatus;
      priority?: FeedbackPriority | null;
    };

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status !== undefined) update.status = status;
    if (priority !== undefined) update.priority = priority;

    const { data: item, error } = await supabase
      .from("feedback_items")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Update feedback item error:", error);
    return NextResponse.json({ error: "Failed to update feedback item" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { FeedbackCategory, FeedbackSeverity } from "@/lib/supabase/types";

const FINISHED_STATUSES = ["done", "wont_fix"];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");
    const sort = searchParams.get("sort") || "top";
    const showFinished = searchParams.get("showFinished") === "1";
    const mine = searchParams.get("mine") === "1";

    let query = supabase
      .from("feedback_items")
      .select(
        `*, author:profiles!feedback_items_author_id_fkey(id, full_name),
         feedback_votes(count), feedback_comments(count), feedback_attachments(count)`
      );

    if (category) query = query.eq("category", category);
    if (priority) query = query.eq("priority", priority);
    if (!showFinished) query = query.not("status", "in", `(${FINISHED_STATUSES.join(",")})`);
    if (mine) query = query.eq("author_id", user.id);

    const { data: items, error } = await query;
    if (error) throw error;

    const { data: myVotes } = await supabase
      .from("feedback_votes")
      .select("item_id")
      .eq("user_id", user.id);
    const votedIds = new Set((myVotes ?? []).map((v) => v.item_id));

    const priorityRank: Record<string, number> = { p0: 0, p1: 1, p2: 2 };
    const shaped = (items ?? []).map((item) => ({
      ...item,
      voteCount: item.feedback_votes?.[0]?.count ?? 0,
      commentCount: item.feedback_comments?.[0]?.count ?? 0,
      attachmentCount: item.feedback_attachments?.[0]?.count ?? 0,
      votedByMe: votedIds.has(item.id),
      feedback_votes: undefined,
      feedback_comments: undefined,
      feedback_attachments: undefined,
    }));

    shaped.sort((a, b) => {
      if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "priority") {
        const ap = a.priority ? priorityRank[a.priority] : 99;
        const bp = b.priority ? priorityRank[b.priority] : 99;
        if (ap !== bp) return ap - bp;
        return b.voteCount - a.voteCount;
      }
      return b.voteCount - a.voteCount;
    });

    return NextResponse.json({ items: shaped });
  } catch (error) {
    console.error("List feedback error:", error);
    return NextResponse.json({ error: "Failed to load feedback" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      category,
      title,
      details,
      severity,
      page_path,
      attachmentUrls,
    } = body as {
      category: FeedbackCategory;
      title: string;
      details: string;
      severity: FeedbackSeverity | null;
      page_path: string | null;
      attachmentUrls?: string[];
    };

    if (!category || !["bug", "comment", "idea"].includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    if (!title?.trim() || !details?.trim()) {
      return NextResponse.json({ error: "Title and details are required" }, { status: 400 });
    }

    const { data: item, error } = await supabase
      .from("feedback_items")
      .insert({
        category,
        title: title.trim(),
        details: details.trim(),
        severity: severity || null,
        page_path: page_path || null,
        author_id: user.id,
      })
      .select("*")
      .single();

    if (error) throw error;

    if (attachmentUrls?.length) {
      const { error: attachError } = await supabase.from("feedback_attachments").insert(
        attachmentUrls.map((url) => ({ item_id: item.id, url }))
      );
      if (attachError) throw attachError;
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Create feedback error:", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}

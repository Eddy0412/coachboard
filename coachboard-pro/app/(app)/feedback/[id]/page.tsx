"use client";

import { use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ThumbsUp } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CATEGORY_META, SEVERITY_META, PRIORITY_META, STATUS_META } from "@/lib/feedback-constants";
import type { FeedbackComment, FeedbackItem, FeedbackPriority, FeedbackStatus } from "@/lib/supabase/types";

type DetailItem = FeedbackItem & {
  author: { id: string; full_name: string } | null;
  voteCount: number;
  votedByMe: boolean;
  attachments: { id: string; url: string }[];
};

type DetailComment = FeedbackComment & { author: { id: string; full_name: string } | null };

export default function FeedbackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentBody, setCommentBody] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["feedback", id],
    queryFn: async () => {
      const res = await fetch(`/api/feedback/${id}`);
      if (!res.ok) throw new Error("Failed to load feedback item");
      return (await res.json()) as { item: DetailItem; comments: DetailComment[] };
    },
  });

  const vote = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/feedback/${id}/vote`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to update vote");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback", id] });
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const triage = useMutation({
    mutationFn: async (patch: { status?: FeedbackStatus; priority?: FeedbackPriority | null }) => {
      const res = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed to update feedback");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback", id] });
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/feedback/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      return res.json();
    },
    onSuccess: () => {
      setCommentBody("");
      queryClient.invalidateQueries({ queryKey: ["feedback", id] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  if (isLoading) return <p className="text-sm text-muted">Loading...</p>;
  if (!data) return <p className="text-sm text-muted">Feedback item not found.</p>;

  const { item, comments } = data;
  const categoryMeta = CATEGORY_META[item.category];
  const CategoryIcon = categoryMeta.icon;
  const isStaff = !!profile?.is_staff;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Link href="/feedback" className="flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="h-4 w-4" /> Back to feedback board
      </Link>

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <CategoryIcon className="h-3.5 w-3.5" />
              {categoryMeta.label}
              {item.severity && (
                <>
                  <span>·</span>
                  <span>{SEVERITY_META[item.severity].label}</span>
                </>
              )}
            </div>
            <h1 className="text-xl font-extrabold">{item.title}</h1>
            <p className="text-xs text-muted">
              {item.author?.full_name ?? "Unknown"} · {new Date(item.created_at).toLocaleDateString()}
              {item.page_path && <span className="font-mono"> · {item.page_path}</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={() => vote.mutate()}
            className={cn(
              "flex w-16 shrink-0 flex-col items-center justify-center rounded-xl border py-2 transition-colors",
              item.votedByMe ? "border-primary-br bg-primary-bg" : "border-border hover:border-muted"
            )}
          >
            <ThumbsUp className="h-4 w-4" />
            <span className="text-sm font-bold tabular-nums">{item.voteCount}</span>
          </button>
        </div>

        <p className="whitespace-pre-wrap text-sm text-text">{item.details}</p>

        {item.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {item.attachments.map((a) => (
              <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
                <Image
                  src={a.url}
                  alt="Attachment"
                  width={160}
                  height={120}
                  className="rounded-lg border border-border object-cover"
                  unoptimized
                />
              </a>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          {isStaff ? (
            <>
              <Select
                value={item.status}
                onChange={(e) => triage.mutate({ status: e.target.value as FeedbackStatus })}
                className="w-auto"
              >
                {(Object.keys(STATUS_META) as FeedbackStatus[]).map((key) => (
                  <option key={key} value={key}>
                    {STATUS_META[key].label}
                  </option>
                ))}
              </Select>
              <Select
                value={item.priority ?? ""}
                onChange={(e) => triage.mutate({ priority: (e.target.value || null) as FeedbackPriority | null })}
                className="w-auto"
              >
                <option value="">No priority</option>
                {(Object.keys(PRIORITY_META) as FeedbackPriority[]).map((key) => (
                  <option key={key} value={key}>
                    {PRIORITY_META[key].label}
                  </option>
                ))}
              </Select>
            </>
          ) : (
            <>
              {item.priority && <Badge variant="default">{PRIORITY_META[item.priority].label}</Badge>}
              <Badge variant={STATUS_META[item.status].finished ? "success" : "primary"}>
                {STATUS_META[item.status].label}
              </Badge>
            </>
          )}
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold">Comments ({comments.length})</h2>
        {comments.map((c) => (
          <Card key={c.id} className="flex flex-col gap-1 p-3">
            <p className="text-xs font-semibold">
              {c.author?.full_name ?? "Unknown"}{" "}
              <span className="font-normal text-muted">{new Date(c.created_at).toLocaleDateString()}</span>
            </p>
            <p className="whitespace-pre-wrap text-sm">{c.body}</p>
          </Card>
        ))}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (commentBody.trim()) addComment.mutate();
          }}
          className="flex flex-col gap-2"
        >
          <Textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
          />
          <Button type="submit" variant="primary" disabled={addComment.isPending || !commentBody.trim()}>
            {addComment.isPending ? "Posting..." : "Post comment"}
          </Button>
        </form>
      </div>
    </div>
  );
}

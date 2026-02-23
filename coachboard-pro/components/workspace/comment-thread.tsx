"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";
import { useSubscription } from "@/hooks/use-subscription";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Lock } from "lucide-react";
import type { Comment, Profile } from "@/lib/supabase/types";

interface CommentThreadProps {
  timestampId: string | null;
  isTeamMember?: boolean;
  teamId?: string | null;
}

export function CommentThread({ timestampId, isTeamMember, teamId }: CommentThreadProps) {
  const [content, setContent] = useState("");
  const { user } = useAuth();
  const { canUseComments } = useSubscription(teamId);
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Invited team members (coaches) can always comment.
  // Only free users who are NOT team members need Pro.
  const canComment = canUseComments || !!isTeamMember;

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", timestampId],
    queryFn: async () => {
      if (!timestampId) return [];
      const { data, error } = await supabase
        .from("comments")
        .select("*, profiles:user_id(full_name, email)")
        .eq("timestamp_id", timestampId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as (Comment & { profiles: Pick<Profile, "full_name" | "email"> })[];
    },
    enabled: !!timestampId,
  });

  const addComment = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase.from("comments").insert({
        timestamp_id: timestampId!,
        user_id: user!.id,
        content: text,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["comments", timestampId] });
    },
  });

  if (!timestampId) return null;

  if (!canComment) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border p-3 text-xs text-muted">
        <Lock className="h-3 w-3" />
        Upgrade to Pro to use comments.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-bold">Comments</h4>

      <div className="max-h-40 overflow-auto rounded-xl border border-border">
        {comments.length === 0 ? (
          <div className="p-3 text-center text-xs text-muted">
            No comments yet.
          </div>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="border-b border-border p-2.5 last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">
                  {c.profiles?.full_name || c.profiles?.email || "Unknown"}
                </span>
                <span className="text-[10px] text-muted">
                  {new Date(c.created_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-sm">{c.content}</p>
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (content.trim()) {
            addComment.mutate(content.trim());
          }
        }}
        className="flex gap-2"
      >
        <Input
          placeholder="Add a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1"
        />
        <Button
          type="submit"
          variant="primary"
          size="icon"
          disabled={!content.trim() || addComment.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { slugify } from "@/lib/utils";
import { parseYouTubeId } from "@/lib/youtube";
import type { Article, ArticleCategory, ArticleStatus } from "@/lib/supabase/types";

interface ArticleFormProps {
  article?: Article;
}

export function ArticleForm({ article }: ArticleFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState<ArticleCategory>(article?.category ?? "kba");
  const [status, setStatus] = useState<ArticleStatus>(article?.status ?? "draft");
  const [title, setTitle] = useState(article?.title ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!article);
  const [topic, setTopic] = useState(article?.topic ?? "");
  const [description, setDescription] = useState(article?.description ?? "");
  const [cause, setCause] = useState(article?.cause ?? "");
  const [resolution, setResolution] = useState(article?.resolution ?? "");
  const [videoInput, setVideoInput] = useState(article?.youtube_video_id ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const trimmedVideo = videoInput.trim();
      const videoId = trimmedVideo
        ? trimmedVideo.includes("youtu")
          ? parseYouTubeId(trimmedVideo) || trimmedVideo
          : trimmedVideo
        : null;

      const payload = {
        category,
        status,
        slug: slug.trim(),
        title: title.trim(),
        topic: topic.trim(),
        description: description.trim(),
        cause: cause.trim() || null,
        resolution: resolution.trim(),
        youtube_video_id: videoId,
      };

      if (article) {
        const { error } = await supabase
          .from("articles")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", article.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("articles").insert({ ...payload, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
      toast(article ? "Article updated." : "Article created.", "success");
      router.push("/admin/articles");
    },
    onError: (err: Error) => {
      toast(`Failed to save: ${err.message}`, "error");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-xs font-medium text-muted">Category</label>
          <Select value={category} onChange={(e) => setCategory(e.target.value as ArticleCategory)}>
            <option value="kba">Knowledge Base Article</option>
            <option value="doc">Documentation</option>
          </Select>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-xs font-medium text-muted">Status</label>
          <Select value={status} onChange={(e) => setStatus(e.target.value as ArticleStatus)}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted">Title</label>
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted">Slug</label>
        <Input
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted">Topic</label>
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Video Import"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted">Description</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted">Cause (optional — KBA how-tos usually have one, Docs usually don't)</label>
        <Textarea value={cause} onChange={(e) => setCause(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted">Resolution</label>
        <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={8} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted">Tutorial video (YouTube URL or ID, optional)</label>
        <Input
          value={videoInput}
          onChange={(e) => setVideoInput(e.target.value)}
          placeholder="https://youtu.be/..."
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/articles")}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={save.isPending}>
          {save.isPending ? "Saving..." : article ? "Save Changes" : "Create Article"}
        </Button>
      </div>
    </form>
  );
}

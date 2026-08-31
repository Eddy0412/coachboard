"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Article } from "@/lib/supabase/types";

export function ArticleDetail({ article }: { article: Article }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-extrabold">{article.title}</h1>
          <Badge>{article.topic}</Badge>
        </div>
        <p className="mt-2 text-sm text-muted">{article.description}</p>
      </div>

      {article.youtube_video_id && (
        <Card className="max-w-xl overflow-hidden p-0">
          <div className="aspect-video w-full">
            <iframe
              src={`https://www.youtube.com/embed/${article.youtube_video_id}?rel=0${
                article.youtube_start_seconds ? `&start=${article.youtube_start_seconds}` : ""
              }`}
              title={article.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </Card>
      )}

      {article.cause && (
        <Card className="flex flex-col gap-2 p-6">
          <h2 className="text-sm font-bold">Cause</h2>
          <p className="whitespace-pre-wrap text-sm text-muted">{article.cause}</p>
        </Card>
      )}

      <Card className="flex flex-col gap-2 p-6">
        <h2 className="text-sm font-bold">{article.cause ? "Resolution" : "Steps"}</h2>
        <p className="whitespace-pre-wrap text-sm text-muted">{article.resolution}</p>
      </Card>
    </div>
  );
}

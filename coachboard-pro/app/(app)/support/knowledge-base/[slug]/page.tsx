"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { ArticleDetail } from "@/components/support/article-detail";
import type { Article } from "@/lib/supabase/types";

export default function KnowledgeBaseArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const supabase = createClient();

  const { data: article, isLoading } = useQuery({
    queryKey: ["article", "kba", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("category", "kba")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data as Article;
    },
  });

  if (isLoading) return <p className="text-muted">Loading...</p>;
  if (!article) return <p className="text-muted">Article not found.</p>;
  return <ArticleDetail article={article} />;
}

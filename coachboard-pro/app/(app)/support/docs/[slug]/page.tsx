"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { ArticleDetail } from "@/components/support/article-detail";
import type { Article } from "@/lib/supabase/types";

export default function DocArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const supabase = createClient();

  const { data: article, isLoading } = useQuery({
    queryKey: ["article", "doc", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("category", "doc")
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

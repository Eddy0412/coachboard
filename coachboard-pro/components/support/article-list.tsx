"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import type { Article, ArticleCategory } from "@/lib/supabase/types";

interface ArticleListProps {
  category: ArticleCategory;
  basePath: string;
}

export function ArticleList({ category, basePath }: ArticleListProps) {
  const supabase = createClient();

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["articles", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("category", category)
        .eq("status", "published")
        .order("topic")
        .order("title");
      if (error) throw error;
      return data as Article[];
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted">Loading...</p>;
  }

  if (articles.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 p-16">
        <p className="text-sm text-muted">No articles published yet. Check back soon!</p>
      </Card>
    );
  }

  const byTopic = articles.reduce<Record<string, Article[]>>((acc, a) => {
    (acc[a.topic] ??= []).push(a);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(byTopic).map(([topic, items]) => (
        <div key={topic} className="flex flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">{topic}</h2>
          {items.map((article) => (
            <Link
              key={article.id}
              href={`${basePath}/${article.slug}`}
              className="flex flex-col gap-1 rounded-xl border border-border p-4 hover:border-muted"
            >
              <span className="text-sm font-medium">{article.title}</span>
              <span className="text-xs text-muted">{article.description}</span>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}

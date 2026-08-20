"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";
import { ArticleForm } from "@/components/support/article-form";
import type { Article } from "@/lib/supabase/types";

export default function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { profile } = useAuth();
  const supabase = createClient();

  const { data: article, isLoading } = useQuery({
    queryKey: ["admin-article", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Article;
    },
    enabled: !!profile?.is_staff,
  });

  if (!profile?.is_staff) {
    return <p className="text-muted">Staff access required.</p>;
  }
  if (isLoading) return <p className="text-muted">Loading...</p>;
  if (!article) return <p className="text-muted">Article not found.</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold">Edit Article</h1>
      <ArticleForm article={article} />
    </div>
  );
}

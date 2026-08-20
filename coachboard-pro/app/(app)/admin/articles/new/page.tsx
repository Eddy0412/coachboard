"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { ArticleForm } from "@/components/support/article-form";

export default function NewArticlePage() {
  const { profile } = useAuth();

  if (!profile?.is_staff) {
    return <p className="text-muted">Staff access required.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold">New Article</h1>
      <ArticleForm />
    </div>
  );
}

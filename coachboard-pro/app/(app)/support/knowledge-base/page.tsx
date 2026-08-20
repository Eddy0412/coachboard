"use client";

import { ArticleList } from "@/components/support/article-list";

export default function KnowledgeBasePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Knowledge Base</h1>
        <p className="text-sm text-muted">Browse guides and tutorials</p>
      </div>
      <ArticleList category="kba" basePath="/support/knowledge-base" />
    </div>
  );
}

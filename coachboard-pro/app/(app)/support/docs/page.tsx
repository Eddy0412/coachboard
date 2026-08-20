"use client";

import { ArticleList } from "@/components/support/article-list";

export default function DocsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Documentation</h1>
        <p className="text-sm text-muted">Guides and reference material</p>
      </div>
      <ArticleList category="doc" basePath="/support/docs" />
    </div>
  );
}

"use client";

import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function KnowledgeBasePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Knowledge Base</h1>
        <p className="text-sm text-muted">Browse guides and tutorials</p>
      </div>
      <Card className="flex flex-col items-center justify-center gap-4 p-16 opacity-80">
        <Lock className="h-10 w-10 text-muted" />
        <Badge>Coming Soon</Badge>
        <p className="text-sm text-muted text-center max-w-md">
          Our knowledge base with guides, tutorials, and best practices is currently being built. Check back soon!
        </p>
      </Card>
    </div>
  );
}

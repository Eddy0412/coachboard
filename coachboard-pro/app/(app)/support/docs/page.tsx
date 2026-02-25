"use client";

import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DocsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Documentation</h1>
        <p className="text-sm text-muted">API docs and integration guides</p>
      </div>
      <Card className="flex flex-col items-center justify-center gap-4 p-16 opacity-80">
        <Lock className="h-10 w-10 text-muted" />
        <Badge>Coming Soon</Badge>
        <p className="text-sm text-muted text-center max-w-md">
          Comprehensive documentation for APIs and integrations is on its way. Stay tuned!
        </p>
      </Card>
    </div>
  );
}

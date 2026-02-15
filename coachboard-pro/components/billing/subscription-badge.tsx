"use client";

import { useSubscription } from "@/hooks/use-subscription";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export function SubscriptionBadge() {
  const { status } = useSubscription();

  if (status === "pro") {
    return (
      <Badge variant="primary">
        <Sparkles className="mr-1 h-3 w-3" />
        Pro
      </Badge>
    );
  }

  if (status === "canceled") {
    return <Badge variant="warning">Canceled</Badge>;
  }

  return <Badge variant="default">Free</Badge>;
}

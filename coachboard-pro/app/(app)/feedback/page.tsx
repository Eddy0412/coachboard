"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, MessageSquare, Paperclip } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CATEGORY_META, SEVERITY_META, PRIORITY_META, STATUS_META } from "@/lib/feedback-constants";
import { FeedbackSubmitDialog } from "@/components/feedback/feedback-submit-dialog";
import type { FeedbackCategory, FeedbackItem, FeedbackPriority } from "@/lib/supabase/types";

type FeedbackListItem = FeedbackItem & {
  author: { id: string; full_name: string } | null;
  voteCount: number;
  commentCount: number;
  attachmentCount: number;
  votedByMe: boolean;
};

const TABS: { key: "all" | FeedbackCategory; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "bug", label: "Bugs" },
  { key: "comment", label: "Comments" },
  { key: "idea", label: "Ideas" },
];

const PRIORITY_TABS: { key: "all" | FeedbackPriority; label: string }[] = [
  { key: "all", label: "Any priority" },
  { key: "p0", label: "P0" },
  { key: "p1", label: "P1" },
  { key: "p2", label: "P2" },
];

export default function FeedbackBoardPage() {
  const [tab, setTab] = useState<"all" | FeedbackCategory>("all");
  const [priority, setPriority] = useState<"all" | FeedbackPriority>("all");
  const [sort, setSort] = useState<"top" | "newest" | "priority">("top");
  const [showFinished, setShowFinished] = useState(false);
  const [mine, setMine] = useState(false);
  const [newReportOpen, setNewReportOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["feedback", priority, sort, showFinished, mine],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (priority !== "all") params.set("priority", priority);
      params.set("sort", sort);
      if (showFinished) params.set("showFinished", "1");
      if (mine) params.set("mine", "1");
      const res = await fetch(`/api/feedback?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load feedback");
      return (await res.json()) as { items: FeedbackListItem[] };
    },
  });

  const items = data?.items ?? [];

  const counts = useMemo(() => {
    const c: Record<string, number> = { bug: 0, comment: 0, idea: 0 };
    for (const item of items) c[item.category] = (c[item.category] ?? 0) + 1;
    return c;
  }, [items]);

  const visibleItems = tab === "all" ? items : items.filter((i) => i.category === tab);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Feedback board</h1>
          <p className="text-sm text-muted max-w-xl">
            Bugs, comments and ideas from everyone using the site. Before reporting something, check whether
            it&apos;s already here — then give it a +1 or add a comment instead.
          </p>
        </div>
        <Button variant="primary" onClick={() => setNewReportOpen(true)}>
          <Plus className="h-4 w-4" />
          New report
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.key ? "border-primary-br bg-primary-bg text-text" : "border-border text-muted hover:text-text"
              )}
            >
              {t.label}
              {t.key !== "all" && <span className="ml-1.5 text-xs text-muted">{counts[t.key] ?? 0}</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant={showFinished ? "primary" : "default"} size="sm" onClick={() => setShowFinished((v) => !v)}>
            Show finished too
          </Button>
          <Button variant={mine ? "primary" : "default"} size="sm" onClick={() => setMine((v) => !v)}>
            Mine
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {PRIORITY_TABS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPriority(p.key)}
              className={cn(
                "rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                priority === p.key ? "border-primary-br bg-primary-bg text-text" : "border-border text-muted hover:text-text"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="w-auto">
          <option value="top">Most +1s</option>
          <option value="newest">Newest</option>
          <option value="priority">Priority</option>
        </Select>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading && <p className="text-sm text-muted">Loading feedback...</p>}
        {!isLoading && visibleItems.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted">Nothing here yet — be the first to report something.</Card>
        )}
        {visibleItems.map((item) => (
          <FeedbackRow key={item.id} item={item} />
        ))}
      </div>

      <FeedbackSubmitDialog open={newReportOpen} onOpenChange={setNewReportOpen} />
    </div>
  );
}

function FeedbackRow({ item }: { item: FeedbackListItem }) {
  const categoryMeta = CATEGORY_META[item.category];
  const CategoryIcon = categoryMeta.icon;
  const statusMeta = STATUS_META[item.status];

  return (
    <Link href={`/feedback/${item.id}`}>
      <Card className="flex items-center gap-4 p-4 transition-colors hover:border-muted">
        <div
          className={cn(
            "flex w-14 shrink-0 flex-col items-center justify-center rounded-xl border py-2",
            item.votedByMe ? "border-primary-br bg-primary-bg" : "border-border"
          )}
        >
          <span className="text-sm font-bold tabular-nums">{item.voteCount}</span>
          <span className="text-[10px] text-muted">{item.votedByMe ? "voted" : "+1"}</span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <CategoryIcon className="h-3.5 w-3.5" />
            {categoryMeta.label}
            {item.severity && (
              <>
                <span>·</span>
                <span>{SEVERITY_META[item.severity].label}</span>
              </>
            )}
          </div>
          <p className="truncate text-sm font-bold">{item.title}</p>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>{item.author?.full_name ?? "Unknown"}</span>
            <span>{new Date(item.created_at).toLocaleDateString()}</span>
            {item.commentCount > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> {item.commentCount}
              </span>
            )}
            {item.attachmentCount > 0 && (
              <span className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" /> {item.attachmentCount}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {item.priority && <Badge variant="default">{PRIORITY_META[item.priority].label}</Badge>}
          <Badge variant={statusMeta.finished ? "success" : "primary"}>{statusMeta.label}</Badge>
        </div>
      </Card>
    </Link>
  );
}

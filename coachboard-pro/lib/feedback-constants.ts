import { Bug, MessageCircle, Lightbulb } from "lucide-react";
import type { FeedbackCategory, FeedbackSeverity, FeedbackPriority, FeedbackStatus } from "@/lib/supabase/types";

export const CATEGORY_META: Record<
  FeedbackCategory,
  { label: string; hint: string; icon: typeof Bug }
> = {
  bug: { label: "Bug", hint: "Something's broken", icon: Bug },
  comment: { label: "Comment", hint: "I have a comment or question", icon: MessageCircle },
  idea: { label: "Idea", hint: "I have an idea", icon: Lightbulb },
};

export const SEVERITY_META: Record<FeedbackSeverity, { label: string }> = {
  small_thing: { label: "Small thing" },
  annoying: { label: "Annoying" },
  blocks_me: { label: "Blocks me" },
  breaks_site: { label: "Breaks the site" },
};

export const PRIORITY_META: Record<FeedbackPriority, { label: string }> = {
  p0: { label: "P0" },
  p1: { label: "P1" },
  p2: { label: "P2" },
};

export const STATUS_META: Record<FeedbackStatus, { label: string; finished: boolean }> = {
  new: { label: "New", finished: false },
  tbd: { label: "TBD", finished: false },
  planned: { label: "Planned", finished: false },
  in_progress: { label: "In progress", finished: false },
  done: { label: "Done", finished: true },
  wont_fix: { label: "Won't fix", finished: true },
};

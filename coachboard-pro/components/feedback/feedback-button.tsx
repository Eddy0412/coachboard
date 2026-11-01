"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { FeedbackSubmitDialog } from "@/components/feedback/feedback-submit-dialog";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-primary-br bg-primary-bg px-4 py-2.5 text-sm font-semibold text-text shadow-lg transition-transform hover:scale-105"
      >
        <Sparkles className="h-4 w-4" />
        Feedback
      </button>
      <FeedbackSubmitDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

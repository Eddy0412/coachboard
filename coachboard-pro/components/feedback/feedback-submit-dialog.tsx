"use client";

import { useState, useRef, useEffect, type DragEvent } from "react";
import { usePathname } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Paperclip, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CATEGORY_META, SEVERITY_META } from "@/lib/feedback-constants";
import type { FeedbackCategory, FeedbackSeverity } from "@/lib/supabase/types";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface FeedbackSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackSubmitDialog({ open, onOpenChange }: FeedbackSubmitDialogProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [severity, setSeverity] = useState<FeedbackSeverity>("annoying");
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setCategory("bug");
    setTitle("");
    setDetails("");
    setSeverity("annoying");
    setFiles([]);
  };

  const addFiles = (incoming: FileList | File[]) => {
    const next = Array.from(incoming).filter((f) => f.type.startsWith("image/") && f.size <= MAX_FILE_BYTES);
    setFiles((prev) => [...prev, ...next].slice(0, MAX_FILES));
  };

  useEffect(() => {
    if (!open) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? [])
        .filter((i) => i.type.startsWith("image/"))
        .map((i) => i.getAsFile())
        .filter((f): f is File => !!f);
      if (items.length) addFiles(items);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [open]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");

      const attachmentUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() || "png";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("feedback-attachments")
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from("feedback-attachments").getPublicUrl(path);
        attachmentUrls.push(publicUrl.publicUrl);
      }

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          title,
          details,
          severity: category === "bug" ? severity : null,
          page_path: pathname,
          attachmentUrls,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to submit feedback");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      toast("Thanks — your feedback was submitted!", "success");
      reset();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast(err.message, "error");
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <p className="text-xs font-bold tracking-wide text-primary">FEEDBACK</p>
          <DialogTitle>What&apos;s on your mind?</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
          className="flex flex-col gap-5"
        >
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(CATEGORY_META) as FeedbackCategory[]).map((key) => {
              const meta = CATEGORY_META[key];
              const Icon = meta.icon;
              const active = category === key;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setCategory(key)}
                  className={cn(
                    "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors",
                    active ? "border-primary-br bg-primary-bg" : "border-border hover:border-muted"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-bold">{meta.label}</span>
                  <span className="text-xs text-muted">{meta.hint}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wide text-muted">SHORT TITLE</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Continue button does nothing on Grant Team"
              required
            />
          </div>

          <div className="flex h-56 flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wide text-muted">DETAILS</label>
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="What did you do, what happened, and what did you expect instead?"
                className="flex-1 resize-none"
                required
              />
              {category === "bug" && (
                <div className="flex shrink-0 flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-wide text-muted">HOW BAD IS IT?</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(Object.keys(SEVERITY_META) as FeedbackSeverity[]).map((key) => (
                      <button
                        type="button"
                        key={key}
                        onClick={() => setSeverity(key)}
                        className={cn(
                          "rounded-xl border px-2 py-2 text-xs font-medium transition-colors",
                          severity === key
                            ? "border-danger-br bg-danger/10 text-danger"
                            : "border-border hover:border-muted"
                        )}
                      >
                        {SEVERITY_META[key].label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wide text-muted">SCREENSHOTS (OPTIONAL)</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e: DragEvent) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e: DragEvent) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-4 text-center text-xs text-muted transition-colors",
                dragOver ? "border-primary-br bg-primary-bg" : "border-border hover:border-muted"
              )}
            >
              <Paperclip className="h-4 w-4" />
              <span>Paste, drop an image here, or click to choose — up to {MAX_FILES}, max 5 MB each</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </div>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {files.map((file, idx) => (
                  <span
                    key={`${file.name}-${idx}`}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-pill px-2.5 py-1 text-xs"
                  >
                    {file.name}
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-muted hover:text-text"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-muted">
            Page: <span className="font-mono">{pathname}</span> (added automatically)
          </p>

          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" disabled={submit.isPending}>
              {submit.isPending ? "Sending..." : `Send ${CATEGORY_META[category].label.toLowerCase()} →`}
            </Button>
            <Button type="button" variant="default" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

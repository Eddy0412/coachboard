"use client";

import { useEffect, useState } from "react";
import { useWorkspaceStore } from "@/stores/workspace";
import { useAutoSaveTimestamp, useDeleteTimestamp } from "@/hooks/use-timestamps";
import { formatTime } from "@/lib/youtube";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, MapPin } from "lucide-react";
import type { Timestamp } from "@/lib/supabase/types";

interface TimestampEditorProps {
  timestamp: Timestamp | null;
  projectId: string;
  canEdit: boolean;
  onSeek: (seconds: number) => void;
}

export function TimestampEditor({
  timestamp,
  projectId,
  canEdit,
  onSeek,
}: TimestampEditorProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const autoSave = useAutoSaveTimestamp();
  const deleteTimestamp = useDeleteTimestamp();
  const { setSelectedTimestamp } = useWorkspaceStore();

  useEffect(() => {
    if (timestamp) {
      setTitle(timestamp.title);
      setDescription(timestamp.description);
    } else {
      setTitle("");
      setDescription("");
    }
  }, [timestamp?.id]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (timestamp && canEdit) {
      autoSave(timestamp.id, { title: val });
    }
  };

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    if (timestamp && canEdit) {
      autoSave(timestamp.id, { description: val });
    }
  };

  const handleDelete = () => {
    if (!timestamp) return;
    deleteTimestamp.mutate({ id: timestamp.id, projectId });
    setSelectedTimestamp(null);
  };

  if (!timestamp) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <p className="text-sm text-muted">Select a timestamp to edit</p>
        <p className="text-xs text-muted">
          Create timestamps from the video controls
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Timestamp Editor</h3>
        <Badge>{formatTime(timestamp.time_seconds)}</Badge>
      </div>

      <Input
        placeholder="Title"
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        disabled={!canEdit}
      />

      <Textarea
        placeholder="Notes / coaching points"
        value={description}
        onChange={(e) => handleDescriptionChange(e.target.value)}
        rows={6}
        disabled={!canEdit}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => onSeek(timestamp.time_seconds)}
        >
          <MapPin className="h-3 w-3" />
          Jump
        </Button>
        {canEdit && (
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={deleteTimestamp.isPending}
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

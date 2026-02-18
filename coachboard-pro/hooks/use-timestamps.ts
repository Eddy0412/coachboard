"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";
import type { Timestamp, TimestampAthlete } from "@/lib/supabase/types";
import { useCallback, useRef } from "react";
import { AUTOSAVE_DEBOUNCE_MS } from "@/lib/constants";

export function useTimestamps(projectId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["timestamps", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timestamps")
        .select("*")
        .eq("project_id", projectId)
        .order("time_seconds", { ascending: true });
      if (error) throw error;
      return data as Timestamp[];
    },
    enabled: !!projectId,
  });
}

export function useTimestampAthletes(timestampId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["timestamp_athletes", timestampId],
    queryFn: async () => {
      if (!timestampId) return [];
      const { data, error } = await supabase
        .from("timestamp_athletes")
        .select("*")
        .eq("timestamp_id", timestampId);
      if (error) throw error;
      return data as TimestampAthlete[];
    },
    enabled: !!timestampId,
  });
}

export function useCreateTimestamp() {
  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      project_id: string;
      time_seconds: number;
      title?: string;
    }) => {
      // Get current max sort_order
      const { data: existing } = await supabase
        .from("timestamps")
        .select("sort_order")
        .eq("project_id", data.project_id)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextOrder = ((existing?.[0]?.sort_order ?? 0) + 1);

      const { data: ts, error } = await supabase
        .from("timestamps")
        .insert({
          project_id: data.project_id,
          time_seconds: data.time_seconds,
          title: data.title || "New coaching point",
          description: "",
          overlay_show_sec: 5,
          sort_order: nextOrder,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return ts as Timestamp;
    },
    onSuccess: (ts) => {
      queryClient.invalidateQueries({
        queryKey: ["timestamps", ts.project_id],
      });
    },
  });
}

export function useUpdateTimestamp() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<Timestamp> & { id: string }) => {
      const { data: ts, error } = await supabase
        .from("timestamps")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return ts as Timestamp;
    },
    onSuccess: (ts) => {
      queryClient.invalidateQueries({
        queryKey: ["timestamps", ts.project_id],
      });
    },
  });
}

export function useDeleteTimestamp() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
    }: {
      id: string;
      projectId: string;
    }) => {
      const { error } = await supabase
        .from("timestamps")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({
        queryKey: ["timestamps", projectId],
      });
    },
  });
}

export function useToggleTimestampAthlete() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      timestampId,
      athleteId,
      tagged,
      projectId,
      projectTitle,
      timestampTitle,
      taggedByName,
    }: {
      timestampId: string;
      athleteId: string;
      tagged: boolean;
      projectId?: string;
      projectTitle?: string;
      timestampTitle?: string;
      taggedByName?: string;
    }) => {
      if (tagged) {
        // Untagging — just delete
        await supabase
          .from("timestamp_athletes")
          .delete()
          .eq("timestamp_id", timestampId)
          .eq("athlete_id", athleteId);
      } else {
        // Tagging — insert + notify
        await supabase
          .from("timestamp_athletes")
          .insert({ timestamp_id: timestampId, athlete_id: athleteId });

        // Fire notification (best effort, non-blocking)
        fetch("/api/notifications/athlete-tagged", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            athleteId,
            timestampTitle: timestampTitle || "a coaching point",
            projectTitle: projectTitle || "a project",
            projectId: projectId || "",
            taggedByName: taggedByName || "Your coach",
          }),
        }).catch(() => { /* best effort */ });
      }
      return timestampId;
    },
    onSuccess: (timestampId) => {
      queryClient.invalidateQueries({
        queryKey: ["timestamp_athletes", timestampId],
      });
      queryClient.invalidateQueries({
        queryKey: ["all-timestamp-athletes"],
      });
    },
  });
}

/** Auto-save hook with debounce */
export function useAutoSaveTimestamp() {
  const updateTimestamp = useUpdateTimestamp();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSave = useCallback(
    (id: string, data: Partial<Timestamp>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        updateTimestamp.mutate({ id, ...data });
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [updateTimestamp]
  );

  return debouncedSave;
}

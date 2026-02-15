"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";
import type { Drawing } from "@/lib/supabase/types";

export function useDrawings(timestampId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["drawings", timestampId],
    queryFn: async () => {
      if (!timestampId) return [];
      const { data, error } = await supabase
        .from("drawings")
        .select("*")
        .eq("timestamp_id", timestampId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Drawing[];
    },
    enabled: !!timestampId,
  });
}

export function useCreateDrawing() {
  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      timestamp_id: string;
      tool: "pen" | "erase";
      color: string;
      size: number;
      points: { x: number; y: number }[];
      sort_order: number;
    }) => {
      const { data: drawing, error } = await supabase
        .from("drawings")
        .insert({
          ...data,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return drawing as Drawing;
    },
    onSuccess: (drawing) => {
      queryClient.invalidateQueries({
        queryKey: ["drawings", drawing.timestamp_id],
      });
    },
  });
}

export function useClearDrawings() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timestampId: string) => {
      const { error } = await supabase
        .from("drawings")
        .delete()
        .eq("timestamp_id", timestampId);
      if (error) throw error;
      return timestampId;
    },
    onSuccess: (timestampId) => {
      queryClient.invalidateQueries({
        queryKey: ["drawings", timestampId],
      });
    },
  });
}

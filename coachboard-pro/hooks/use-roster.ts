"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";
import type { Athlete } from "@/lib/supabase/types";

export function useRoster(teamId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["athletes", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await supabase
        .from("athletes")
        .select("*")
        .eq("team_id", teamId)
        .order("last_name");
      if (error) throw error;
      return data as Athlete[];
    },
    enabled: !!teamId,
  });
}

export function useCreateAthlete() {
  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      team_id: string;
      first_name: string;
      last_name: string;
      position: string;
      jersey_number: string;
    }) => {
      const { data: athlete, error } = await supabase
        .from("athletes")
        .insert({ ...data, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return athlete as Athlete;
    },
    onSuccess: (athlete) => {
      queryClient.invalidateQueries({ queryKey: ["athletes", athlete.team_id] });
    },
  });
}

export function useUpdateAthlete() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      teamId,
      ...data
    }: {
      id: string;
      teamId: string;
      first_name?: string;
      last_name?: string;
      position?: string;
      jersey_number?: string;
    }) => {
      const { error } = await supabase
        .from("athletes")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return teamId;
    },
    onSuccess: (teamId) => {
      queryClient.invalidateQueries({ queryKey: ["athletes", teamId] });
    },
  });
}

export function useDeleteAthlete() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      teamId,
    }: {
      id: string;
      teamId: string;
    }) => {
      const { error } = await supabase
        .from("athletes")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return teamId;
    },
    onSuccess: (teamId) => {
      queryClient.invalidateQueries({ queryKey: ["athletes", teamId] });
    },
  });
}

export function useBulkCreateAthletes() {
  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      athletes,
    }: {
      teamId: string;
      athletes: {
        first_name: string;
        last_name: string;
        position: string;
        jersey_number: string;
      }[];
    }) => {
      const rows = athletes.map((a) => ({
        ...a,
        team_id: teamId,
        created_by: user!.id,
      }));
      const { data, error } = await supabase
        .from("athletes")
        .insert(rows)
        .select();
      if (error) throw error;
      return data as Athlete[];
    },
    onSuccess: (_data, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ["athletes", teamId] });
    },
  });
}

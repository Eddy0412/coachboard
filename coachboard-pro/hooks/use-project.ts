"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";
import type { Project } from "@/lib/supabase/types";

export function useProjects() {
  const { user } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get projects from teams user belongs to
      const { data: teamMembers } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .eq("status", "accepted");

      const teamIds = teamMembers?.map((tm) => tm.team_id) ?? [];

      // Also get projects where user has direct access
      const { data: directAccess } = await supabase
        .from("project_access")
        .select("project_id")
        .eq("user_id", user.id);

      const directProjectIds = directAccess?.map((pa) => pa.project_id) ?? [];

      let query = supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });

      if (teamIds.length && directProjectIds.length) {
        query = query.or(
          `team_id.in.(${teamIds.join(",")}),id.in.(${directProjectIds.join(",")})`
        );
      } else if (teamIds.length) {
        query = query.in("team_id", teamIds);
      } else if (directProjectIds.length) {
        query = query.in("id", directProjectIds);
      } else {
        // User has no teams or access — also check if they created any
        query = query.eq("created_by", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!user,
  });
}

export function useProject(id: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Project;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      youtube_url: string;
      youtube_id: string;
      team_id: string;
      category?: string;
    }) => {
      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          ...data,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Give creator admin access
      const { error: accessErr } = await supabase.from("project_access").insert({
        project_id: project.id,
        user_id: user!.id,
        permission: "admin",
        granted_by: user!.id,
      });
      if (accessErr) console.warn("Could not create project_access:", accessErr);

      return project as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<Project> & { id: string }) => {
      const { data: project, error } = await supabase
        .from("projects")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return project as Project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteProject() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

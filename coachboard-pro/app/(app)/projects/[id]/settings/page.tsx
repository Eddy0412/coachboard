"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useProject, useUpdateProject, useDeleteProject } from "@/hooks/use-project";
import { useAuth } from "@/components/auth/auth-provider";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Trash2, Link as LinkIcon, Lock } from "lucide-react";
import Link from "next/link";
import { copyToClipboard } from "@/lib/utils";
import type { ShareLink, ProjectAccess, Profile } from "@/lib/supabase/types";

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: project } = useProject(id);
  const { canUseShareLinks } = useSubscription(project?.team_id);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Initialize form when project loads
  if (project && !title) {
    setTitle(project.title);
    setDescription(project.description || "");
  }

  // Share links
  const { data: shareLinks = [] } = useQuery({
    queryKey: ["share-links", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("share_links")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ShareLink[];
    },
  });

  const createShareLink = useMutation({
    mutationFn: async () => {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      const token = Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
      const { data, error } = await supabase
        .from("share_links")
        .insert({
          project_id: id,
          token,
          permission: "read",
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ShareLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["share-links", id] });
      toast("Share link created!", "success");
    },
    onError: () => {
      toast("Failed to create share link. Make sure you have admin access.", "error");
    },
  });

  // Project access list
  const { data: accessList = [] } = useQuery({
    queryKey: ["project-access-list", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_access")
        .select("*, profiles:user_id(full_name, email)")
        .eq("project_id", id);
      if (error) throw error;
      return data as (ProjectAccess & {
        profiles: Pick<Profile, "full_name" | "email">;
      })[];
    },
  });

  const handleSave = async () => {
    if (!project) return;
    await updateProject.mutateAsync({ id: project.id, title, description });
    toast("Project updated!", "success");
    router.push(`/projects/${id}`);
  };

  const handleDelete = async () => {
    if (!project) return;
    if (!confirm("Are you sure you want to delete this project? This cannot be undone."))
      return;
    await deleteProject.mutateAsync(project.id);
    router.push("/dashboard");
  };

  if (!project) {
    return <div className="text-muted">Loading...</div>;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to project
          </Button>
        </Link>
        <h1 className="text-2xl font-extrabold">Project Settings</h1>
      </div>

      {/* Basic info */}
      <Card className="flex flex-col gap-4 p-6">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Project title"
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={3}
        />
        <Button variant="primary" onClick={handleSave}>
          Save changes
        </Button>
      </Card>

      {/* Share links */}
      <Card className="flex flex-col gap-4 p-6">
        <CardHeader>
          <CardTitle>Share Links</CardTitle>
          <CardDescription>
            Create read-only links to share this project.
          </CardDescription>
        </CardHeader>
        {!canUseShareLinks ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Lock className="h-4 w-4" />
            Share links are a Pro feature.
          </div>
        ) : (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={() => createShareLink.mutate()}
              disabled={createShareLink.isPending}
            >
              <LinkIcon className="h-4 w-4" />
              Create share link
            </Button>
            {shareLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center gap-2 rounded-xl border border-border bg-input p-3"
              >
                <code className="flex-1 truncate text-xs">
                  {appUrl}/shared/{link.token}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const ok = copyToClipboard(`${appUrl}/shared/${link.token}`);
                    toast(ok ? "Link copied!" : "Could not copy — copy the link manually.", ok ? "success" : "error");
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </>
        )}
      </Card>

      {/* Access list */}
      <Card className="flex flex-col gap-4 p-6">
        <CardHeader>
          <CardTitle>Access</CardTitle>
          <CardDescription>
            Users with access to this project.
          </CardDescription>
        </CardHeader>
        {accessList.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between rounded-xl border border-border p-3"
          >
            <div>
              <div className="text-sm font-medium">
                {a.profiles?.full_name || a.profiles?.email}
              </div>
              <div className="text-xs text-muted">{a.profiles?.email}</div>
            </div>
            <Badge>{a.permission}</Badge>
          </div>
        ))}
      </Card>

      {/* Danger zone */}
      <Card className="flex flex-col gap-4 border-danger-br p-6">
        <CardHeader>
          <CardTitle className="text-danger">Danger Zone</CardTitle>
        </CardHeader>
        <Button variant="danger" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
          Delete project
        </Button>
      </Card>
    </div>
  );
}

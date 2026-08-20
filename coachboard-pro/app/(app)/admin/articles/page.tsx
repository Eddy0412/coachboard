"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Plus, Trash2, Pencil } from "lucide-react";
import type { Article } from "@/lib/supabase/types";

export default function AdminArticlesPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: articles = [] } = useQuery({
    queryKey: ["admin-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Article[];
    },
    enabled: !!profile?.is_staff,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
      toast("Article deleted.", "success");
    },
    onError: (err: Error) => toast(`Failed to delete: ${err.message}`, "error"),
  });

  if (!profile?.is_staff) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold">Articles</h1>
        <p className="text-muted">Staff access required.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Articles</h1>
          <p className="text-sm text-muted">Manage Knowledge Base and Documentation content</p>
        </div>
        <Link href="/admin/articles/new">
          <Button variant="primary">
            <Plus className="h-4 w-4" />
            New Article
          </Button>
        </Link>
      </div>

      <Card className="flex flex-col gap-4 p-6">
        {articles.length === 0 ? (
          <p className="text-sm text-muted">No articles yet.</p>
        ) : (
          articles.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-xl border border-border p-3"
            >
              <div className="flex items-center gap-2">
                <Badge variant={a.category === "kba" ? "primary" : "default"}>
                  {a.category === "kba" ? "KBA" : "DOC"}
                </Badge>
                <Badge variant={a.status === "published" ? "success" : "warning"}>{a.status}</Badge>
                <span className="text-sm font-medium">{a.title}</span>
                <span className="text-xs text-muted">{a.topic}</span>
              </div>
              <div className="flex items-center gap-1">
                <Link href={`/admin/articles/${a.id}/edit`}>
                  <Button variant="ghost" size="sm">
                    <Pencil className="h-3 w-3" />
                  </Button>
                </Link>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => remove.mutate(a.id)}
                  disabled={remove.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

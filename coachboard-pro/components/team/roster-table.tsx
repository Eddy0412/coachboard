"use client";

import { useState, useRef } from "react";
import { useRoster, useCreateAthlete, useDeleteAthlete, useBulkCreateAthletes } from "@/hooks/use-roster";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/components/ui/toast";
import { toCSV, fromCSV } from "@/lib/csv";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload, Trash2, Search } from "lucide-react";
import type { Athlete } from "@/lib/supabase/types";

interface RosterTableProps {
  teamId: string;
  canEdit: boolean;
}

export function RosterTable({ teamId, canEdit }: RosterTableProps) {
  const { data: athletes = [], isLoading } = useRoster(teamId);
  const createAthlete = useCreateAthlete();
  const deleteAthlete = useDeleteAthlete();
  const bulkCreate = useBulkCreateAthletes();
  const { canAddAthlete, canUseCsvExport } = useSubscription();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [jersey, setJersey] = useState("");

  const norm = (s: string) => s.toLowerCase().trim();
  const filtered = athletes.filter((a) => {
    if (!search) return true;
    const q = norm(search);
    return (
      norm(a.first_name).includes(q) ||
      norm(a.last_name).includes(q) ||
      norm(a.position).includes(q) ||
      norm(a.jersey_number).includes(q)
    );
  });

  const handleAdd = async () => {
    if (!firstName || !lastName) {
      toast("First and last name required.", "error");
      return;
    }
    if (!canAddAthlete(athletes.length)) {
      toast("Free tier limit reached. Upgrade to Pro.", "error");
      return;
    }
    await createAthlete.mutateAsync({
      team_id: teamId,
      first_name: firstName,
      last_name: lastName,
      position,
      jersey_number: jersey,
    });
    setFirstName("");
    setLastName("");
    setPosition("");
    setJersey("");
    toast("Athlete added!", "success");
  };

  const handleExport = () => {
    if (!canUseCsvExport) {
      toast("CSV export is a Pro feature.", "error");
      return;
    }
    const csv = toCSV(
      athletes.map((a) => ({
        first_name: a.first_name,
        last_name: a.last_name,
        position: a.position,
        jersey_number: a.jersey_number,
      })),
      ["first_name", "last_name", "position", "jersey_number"]
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "roster.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { rows } = fromCSV(text);
    const mapped = rows
      .map((r) => ({
        first_name: (r.first_name ?? r.first ?? r.name ?? "").trim(),
        last_name: (r.last_name ?? r.last ?? r.surname ?? "").trim(),
        position: (r.position ?? r.pos ?? "").trim(),
        jersey_number: (r.jersey_number ?? r.jersey ?? r.number ?? "").trim(),
      }))
      .filter((r) => r.first_name || r.last_name);

    if (!mapped.length) {
      toast("No valid rows found in CSV.", "error");
      return;
    }

    await bulkCreate.mutateAsync({ teamId, athletes: mapped });
    toast(`Imported ${mapped.length} athletes.`, "success");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Roster</h2>
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" onClick={handleExport}>
            <Download className="h-3 w-3" />
            Export CSV
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3 w-3" />
            Import CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

      {canEdit && (
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <h3 className="text-sm font-bold">Add athlete</h3>
          </div>
          <Input
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <Input
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <Input
            placeholder="Position (QB, WR...)"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
          <div className="flex gap-2">
            <Input
              placeholder="Jersey #"
              value={jersey}
              onChange={(e) => setJersey(e.target.value)}
            />
            <Button
              variant="primary"
              onClick={handleAdd}
              disabled={createAthlete.isPending}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          placeholder="Search roster..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="overflow-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky top-0 bg-card px-3 py-2.5 text-left font-bold">
                First
              </th>
              <th className="sticky top-0 bg-card px-3 py-2.5 text-left font-bold">
                Last
              </th>
              <th className="sticky top-0 bg-card px-3 py-2.5 text-left font-bold">
                Pos
              </th>
              <th className="sticky top-0 bg-card px-3 py-2.5 text-left font-bold">
                Jersey
              </th>
              {canEdit && (
                <th className="sticky top-0 bg-card px-3 py-2.5 text-right font-bold">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-muted">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-muted">
                  {athletes.length === 0
                    ? "No athletes yet."
                    : "No matches."}
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2.5">{a.first_name}</td>
                  <td className="px-3 py-2.5">{a.last_name}</td>
                  <td className="px-3 py-2.5">{a.position}</td>
                  <td className="px-3 py-2.5">{a.jersey_number}</td>
                  {canEdit && (
                    <td className="px-3 py-2.5 text-right">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() =>
                          deleteAthlete.mutate({
                            id: a.id,
                            teamId,
                          })
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

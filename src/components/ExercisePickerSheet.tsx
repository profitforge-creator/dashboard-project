"use client";

import { useMemo, useState } from "react";
import { Search, Plus, X, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Lock } from "lucide-react";
import type { WorkoutExercise } from "@/lib/supabase/types";
import { EXERCISE_CATALOG, DAY_TAGS } from "@/lib/workoutCatalog";
import { Sheet } from "@/components/Sheet";

interface ExercisePickerSheetProps {
  open: boolean;
  onClose: () => void;
  day: string;
  picks: WorkoutExercise[];
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
  onReorder: (id: string, direction: "up" | "down") => void;
}

export function ExercisePickerSheet({ open, onClose, day, picks, onAdd, onRemove, onReorder }: ExercisePickerSheetProps) {
  const [search, setSearch] = useState("");
  const [browseOpen, setBrowseOpen] = useState(false);

  const pickedNames = useMemo(() => new Set(picks.map((p) => p.name.toLowerCase())), [picks]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return EXERCISE_CATALOG.filter((e) => e.name.toLowerCase().includes(q) && !pickedNames.has(e.name.toLowerCase())).slice(0, 8);
  }, [search, pickedNames]);

  const browseList = useMemo(() => {
    const relevantTags = DAY_TAGS[day] ?? [];
    return EXERCISE_CATALOG.filter((e) => relevantTags.includes(e.tag) && !pickedNames.has(e.name.toLowerCase()));
  }, [day, pickedNames]);

  function addCustom() {
    if (!search.trim()) return;
    onAdd(search.trim());
    setSearch("");
  }

  return (
    <Sheet open={open} onClose={onClose} title={day} maxWidth="max-w-lg">
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" strokeWidth={2} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchResults.length === 0 && addCustom()}
          placeholder="Search any exercise…"
          className="min-h-11 w-full rounded-xl border border-border bg-bg pl-10 pr-3.5 text-sm text-text outline-none focus:border-blue"
        />
      </div>

      {search.trim() && (
        <div className="mb-4 space-y-1.5">
          {searchResults.map((e) => (
            <button
              key={e.name}
              onClick={() => {
                onAdd(e.name);
                setSearch("");
              }}
              className="flex w-full items-center justify-between rounded-xl border border-border px-3.5 py-2.5 text-left text-sm text-text hover:border-border-strong"
            >
              {e.name}
              <Plus className="h-3.5 w-3.5 text-blue-light" strokeWidth={2} />
            </button>
          ))}
          {searchResults.length === 0 && (
            <button onClick={addCustom} className="flex w-full items-center justify-between rounded-xl border border-dashed border-border px-3.5 py-2.5 text-left text-sm text-blue-light">
              Add &ldquo;{search.trim()}&rdquo; as a custom exercise
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
        </div>
      )}

      <div className="mb-2 flex items-center justify-between">
        <p className="label-mono text-text-secondary">Your picks</p>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue/15 px-1.5 text-[10px] font-bold text-blue-light">{picks.length}</span>
      </div>

      {picks.length === 0 ? (
        <p className="mb-4 text-sm text-text-secondary">No exercises picked for {day} yet — search above or browse below.</p>
      ) : (
        <div className="mb-4 space-y-1.5">
          {picks.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5">
              <Lock className="h-3.5 w-3.5 flex-shrink-0 text-text-secondary/50" strokeWidth={2} />
              <span className="min-w-0 flex-1 truncate text-sm text-text">{p.name}</span>
              <div className="flex flex-shrink-0 items-center gap-0.5">
                <button
                  onClick={() => onReorder(p.id, "up")}
                  disabled={i === 0}
                  aria-label="Move up"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary hover:bg-card-secondary hover:text-text disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
                <button
                  onClick={() => onReorder(p.id, "down")}
                  disabled={i === picks.length - 1}
                  aria-label="Move down"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary hover:bg-card-secondary hover:text-text disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
                <button onClick={() => onRemove(p.id)} aria-label={`Remove ${p.name}`} className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary hover:bg-error/10 hover:text-error">
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {browseList.length > 0 && (
        <div>
          <button onClick={() => setBrowseOpen((v) => !v)} className="flex w-full items-center justify-between rounded-xl border border-border px-3.5 py-2.5 text-sm font-medium text-text">
            <span className="flex items-center gap-1.5">
              {browseOpen ? <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} /> : <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />}
              Browse {day.toLowerCase()} lifts
            </span>
            <span className="text-xs text-text-secondary">{browseList.length}</span>
          </button>
          {browseOpen && (
            <div className="mt-1.5 max-h-64 space-y-1.5 overflow-y-auto">
              {browseList.map((e) => (
                <button
                  key={e.name}
                  onClick={() => onAdd(e.name)}
                  className="flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-left text-sm text-text-secondary hover:bg-card-secondary hover:text-text"
                >
                  {e.name}
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

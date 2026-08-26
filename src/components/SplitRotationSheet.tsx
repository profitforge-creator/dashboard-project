"use client";

import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, X, Plus } from "lucide-react";
import type { SplitRotationDay } from "@/lib/supabase/types";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/Button";
import { computeRotationTodayIndex } from "@/lib/rotation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { todayISO } from "@/lib/utils";

interface DraftDay {
  key: string;
  name: string;
}

interface SplitRotationSheetProps {
  open: boolean;
  onClose: () => void;
  days: SplitRotationDay[];
  anchorDate: string | null;
  anchorIndex: number | null;
  onSaved: () => void;
}

export function SplitRotationSheet({ open, onClose, days, anchorDate, anchorIndex, onSaved }: SplitRotationSheetProps) {
  const toast = useToast();
  const [draft, setDraft] = useState<DraftDay[]>([]);
  const [todayKey, setTodayKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initial: DraftDay[] = days.map((d) => ({ key: d.id, name: d.name }));
    setDraft(initial);
    const idx = computeRotationTodayIndex(days.length, anchorDate, anchorIndex, todayISO());
    setTodayKey(idx != null ? initial[idx]?.key ?? initial[0]?.key ?? null : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function moveUp(i: number) {
    if (i === 0) return;
    setDraft((d) => {
      const next = [...d];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  }
  function moveDown(i: number) {
    setDraft((d) => {
      if (i === d.length - 1) return d;
      const next = [...d];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  }
  function removeDay(i: number) {
    setDraft((d) => {
      if (d.length <= 1) return d;
      const removedKey = d[i].key;
      const next = d.filter((_, idx) => idx !== i);
      if (removedKey === todayKey) setTodayKey(next[0]?.key ?? null);
      return next;
    });
  }
  function addDay() {
    setDraft((d) => [...d, { key: crypto.randomUUID(), name: "" }]);
  }
  function renameDay(i: number, name: string) {
    setDraft((d) => d.map((day, idx) => (idx === i ? { ...day, name } : day)));
  }

  async function save() {
    const cleaned = draft.filter((d) => d.name.trim().length > 0);
    if (cleaned.length === 0) {
      toast("Add at least one day.", "error");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const todayIdx = Math.max(
      0,
      cleaned.findIndex((d) => d.key === todayKey)
    );

    const { error: deleteError } = await supabase.from("split_rotation_days").delete().eq("user_id", user.id);
    if (deleteError) {
      toast("Couldn't save the rotation.", "error");
      setSaving(false);
      return;
    }
    const { error: insertError } = await supabase.from("split_rotation_days").insert(
      cleaned.map((d, i) => ({ user_id: user.id, name: d.name.trim(), sort_order: i }))
    );
    if (insertError) {
      toast("Couldn't save the rotation.", "error");
      setSaving(false);
      return;
    }
    await supabase.from("fitness_profile").upsert(
      { user_id: user.id, rotation_anchor_date: todayISO(), rotation_anchor_index: todayIdx },
      { onConflict: "user_id" }
    );

    setSaving(false);
    toast("Split rotation saved.", "success");
    onSaved();
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Edit split rotation">
      <p className="mb-4 text-xs text-text-secondary">
        Days cycle in this order, repeating forever. Today is whichever entry is highlighted. Use <span className="font-semibold text-text">Today is →</span> to jump the
        cycle to a different starting day.
      </p>

      <div className="space-y-2">
        {draft.map((d, i) => {
          const isToday = d.key === todayKey;
          return (
            <div
              key={d.key}
              className={`flex items-center gap-2.5 rounded-2xl border p-3 transition-colors ${
                isToday ? "border-success/40 bg-success/10" : "border-border bg-card"
              }`}
            >
              <span className="w-4 flex-shrink-0 text-xs text-text-secondary">{i + 1}</span>
              <input
                type="text"
                value={d.name}
                onChange={(e) => renameDay(i, e.target.value)}
                placeholder="Day name"
                className="min-h-9 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1.5 text-sm font-medium text-text outline-none focus:border-blue focus:bg-bg"
              />
              {isToday ? (
                <span className="flex-shrink-0 rounded-full bg-success px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-bg">Today</span>
              ) : (
                <button
                  onClick={() => setTodayKey(d.key)}
                  className="flex-shrink-0 rounded-full border border-border-strong px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-secondary transition-colors hover:border-blue hover:text-blue-light"
                >
                  Today is →
                </button>
              )}
              <button
                onClick={() => moveUp(i)}
                disabled={i === 0}
                aria-label="Move up"
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-card-secondary hover:text-text disabled:opacity-30"
              >
                <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button
                onClick={() => moveDown(i)}
                disabled={i === draft.length - 1}
                aria-label="Move down"
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-card-secondary hover:text-text disabled:opacity-30"
              >
                <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button
                onClick={() => removeDay(i)}
                disabled={draft.length <= 1}
                aria-label="Remove day"
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-error/10 hover:text-error disabled:opacity-30"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={addDay}
        className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border text-sm font-medium text-text-secondary transition-colors hover:border-border-strong hover:text-text"
      >
        <Plus className="h-4 w-4" strokeWidth={2} /> Add day
      </button>

      <div className="mt-5 flex gap-3">
        <Button variant="ghost" onClick={onClose} block>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving} block>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </Sheet>
  );
}

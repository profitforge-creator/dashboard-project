"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, Flame, Check, HeartPulse, Briefcase, Wallet, Sparkle, Circle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Habit, HabitLog, GoalCategory } from "@/lib/supabase/types";
import { HabitGrid } from "@/components/HabitGrid";
import { EmptyState } from "@/components/EmptyState";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/Button";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmationDialog";
import { cn } from "@/lib/utils";

interface HabitsClientProps {
  habits: Habit[];
  logs: HabitLog[];
  today: string;
}

const CATEGORIES: { key: GoalCategory; label: string; icon: LucideIcon }[] = [
  { key: "health", label: "Health", icon: HeartPulse },
  { key: "business", label: "Business", icon: Briefcase },
  { key: "financial", label: "Financial", icon: Wallet },
  { key: "spiritual", label: "Spiritual", icon: Sparkle },
  { key: "general", label: "General", icon: Circle },
];

function last28Days(today: string): string[] {
  const days: string[] = [];
  const base = new Date(today + "T12:00:00");
  for (let i = 27; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function bestStreak(days: { completed: boolean }[]): number {
  let best = 0;
  let run = 0;
  for (const d of days) {
    run = d.completed ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

export function HabitsClient({ habits, logs, today }: HabitsClientProps) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [form, setForm] = useState<{ name: string; category: GoalCategory }>({ name: "", category: "general" });

  const days = last28Days(today);
  const logsToday = new Set(logs.filter((l) => l.log_date === today && l.completed).map((l) => l.habit_id));
  const doneToday = habits.filter((h) => logsToday.has(h.id)).length;

  function openCreate() {
    setEditing(null);
    setForm({ name: "", category: "general" });
    setSheetOpen(true);
  }

  function openEdit(h: Habit) {
    setEditing(h);
    setForm({ name: h.name, category: h.category });
    setSheetOpen(true);
  }

  async function toggleToday(habit: Habit) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const existing = logs.find((l) => l.habit_id === habit.id && l.log_date === today);
    if (existing) {
      await supabase.from("habit_logs").delete().eq("id", existing.id);
    } else {
      await supabase.from("habit_logs").insert({ habit_id: habit.id, user_id: user.id, log_date: today, completed: true });
    }
    router.refresh();
  }

  async function saveHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (editing) {
      const { error } = await supabase.from("habits").update({ name: form.name.trim(), category: form.category }).eq("id", editing.id);
      if (error) {
        toast("Couldn't update habit.", "error");
        return;
      }
      toast("Habit updated.", "success");
    } else {
      const { error } = await supabase.from("habits").insert({ user_id: user.id, name: form.name.trim(), category: form.category });
      if (error) {
        toast("Couldn't add habit.", "error");
        return;
      }
      toast("Habit added.", "success");
    }
    setSheetOpen(false);
    router.refresh();
  }

  async function deleteHabit(habit: Habit) {
    const ok = await confirm({ title: "Delete habit?", description: "This removes its full tracking history too.", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    const supabase = createClient();
    await supabase.from("habits").delete().eq("id", habit.id);
    toast("Habit deleted.", "success");
    router.refresh();
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Habits</h1>
          <p className="text-sm text-text-secondary">
            {habits.length ? `${doneToday}/${habits.length} done today` : "Track daily consistency"}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-blue text-bg transition-colors hover:bg-blue/90"
          aria-label="New habit"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>

      {habits.length === 0 ? (
        <EmptyState icon={Flame} title="No habits yet" description="Add one to start building a streak." />
      ) : (
        <div className="space-y-3">
          {habits.map((h) => {
            const habitDays = days.map((date) => ({
              date,
              completed: logs.some((l) => l.habit_id === h.id && l.log_date === date && l.completed),
            }));
            const best = bestStreak(habitDays);
            const doneNow = logsToday.has(h.id);
            const catLabel = CATEGORIES.find((c) => c.key === h.category)?.label ?? "General";
            return (
              <div key={h.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleToday(h)}
                        aria-label={doneNow ? `Mark ${h.name} not done today` : `Mark ${h.name} done today`}
                        className={cn(
                          "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          doneNow ? "border-success bg-success text-bg" : "border-border-strong text-transparent"
                        )}
                      >
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </button>
                      <p className="truncate text-sm font-medium text-text">{h.name}</p>
                    </div>
                    <p className="ml-9 text-xs text-text-secondary">
                      {catLabel} · Best streak {best} day{best === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button onClick={() => openEdit(h)} aria-label={`Edit ${h.name}`} className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-card-secondary hover:text-text">
                      <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                    <button onClick={() => deleteHabit(h)} aria-label={`Delete ${h.name}`} className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-error/10 hover:text-error">
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                </div>
                <HabitGrid name="" days={habitDays} bare />
              </div>
            );
          })}
        </div>
      )}

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={editing ? "Edit habit" : "New habit"}>
        <form onSubmit={saveHabit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Morning walk"
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c.key}
                  onClick={() => setForm((f) => ({ ...f, category: c.key }))}
                  className={cn(
                    "flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors",
                    form.category === c.key ? "border-blue bg-blue/15 text-blue-light" : "border-border text-text-secondary hover:text-text"
                  )}
                >
                  <c.icon className="h-3.5 w-3.5" strokeWidth={2} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" block>
            {editing ? "Save changes" : "Add habit"}
          </Button>
        </form>
      </Sheet>
    </div>
  );
}

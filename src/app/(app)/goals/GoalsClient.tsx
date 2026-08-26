"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Target, Plus } from "lucide-react";
import type { Goal, GoalCategory, GoalPriority, GoalTerm } from "@/lib/supabase/types";
import { GoalCard } from "@/components/GoalCard";
import { FilterPills } from "@/components/FilterPills";
import { EmptyState } from "@/components/EmptyState";
import { Sheet } from "@/components/Sheet";
import { ChatSheet } from "@/components/ChatSheet";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmationDialog";

type Filter = "all" | "long" | "short" | "today" | "completed";

interface GoalsClientProps {
  goals: Goal[];
  progressByGoal: Record<string, number>;
  todayGoalIds: string[];
}

const emptyForm = {
  title: "",
  description: "",
  term: "long" as GoalTerm,
  category: "general" as GoalCategory,
  priority: "medium" as GoalPriority,
  next_action: "",
  deadline: "",
};

export function GoalsClient({ goals, progressByGoal, todayGoalIds }: GoalsClientProps) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<Filter>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [chatGoal, setChatGoal] = useState<Goal | null>(null);

  const filtered = useMemo(() => {
    switch (filter) {
      case "long":
        return goals.filter((g) => g.term === "long" && g.status === "active");
      case "short":
        return goals.filter((g) => g.term === "short" && g.status === "active");
      case "today":
        return goals.filter((g) => todayGoalIds.includes(g.id));
      case "completed":
        return goals.filter((g) => g.status === "completed");
      default:
        return goals.filter((g) => g.status === "active");
    }
  }, [goals, filter, todayGoalIds]);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setSheetOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditingId(goal.id);
    setForm({
      title: goal.title,
      description: goal.description,
      term: goal.term,
      category: goal.category,
      priority: goal.priority,
      next_action: goal.next_action,
      deadline: goal.deadline ? goal.deadline.slice(0, 10) : "",
    });
    setSheetOpen(true);
  }

  async function saveGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const supabase = createClient();
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      term: form.term,
      category: form.category,
      priority: form.priority,
      next_action: form.next_action.trim(),
      deadline: form.deadline ? new Date(form.deadline + "T23:59:59").toISOString() : null,
    };
    if (editingId) {
      const { error } = await supabase.from("goals").update(payload).eq("id", editingId);
      if (error) return toast("Could not save the goal.", "error");
      toast("Goal updated");
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("goals").insert({ ...payload, user_id: user!.id });
      if (error) return toast("Could not save the goal.", "error");
      toast("Goal created");
    }
    setSheetOpen(false);
    router.refresh();
  }

  async function deleteGoal(goal: Goal) {
    const ok = await confirm({ title: "Delete this goal?", description: "This can't be undone.", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    const supabase = createClient();
    const { error } = await supabase.from("goals").delete().eq("id", goal.id);
    if (error) return toast("Could not delete the goal.", "error");
    toast("Goal deleted");
    router.refresh();
  }

  async function toggleComplete(goal: Goal) {
    const supabase = createClient();
    const completed = goal.status !== "completed";
    const { error } = await supabase
      .from("goals")
      .update({ status: completed ? "completed" : "active", completed_at: completed ? new Date().toISOString() : null })
      .eq("id", goal.id);
    if (error) return toast("Could not update the goal.", "error");
    if (completed) {
      await supabase.from("goal_progress_logs").insert({ goal_id: goal.id, user_id: goal.user_id, progress_pct: 100 });
    }
    router.refresh();
  }

  async function addToCalendar() {
    toast("Calendar isn't connected yet — add it from Profile > Integrations.");
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Goals</h1>
          <p className="text-sm text-text-secondary">Long-term direction, short-term wins.</p>
        </div>
        <button
          onClick={openNew}
          className="flex min-h-11 items-center gap-1.5 rounded-xl bg-blue px-4 text-sm font-semibold text-white transition-colors hover:bg-blue/90"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> New Goal
        </button>
      </div>

      <FilterPills
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "Active" },
          { value: "long", label: "Long-term" },
          { value: "short", label: "Short-term" },
          { value: "today", label: "Today" },
          { value: "completed", label: "Completed" },
        ]}
      />

      {filtered.length ? (
        <div className="flex flex-col gap-3">
          {filtered.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              progressPct={progressByGoal[g.id] ?? 0}
              onEdit={() => openEdit(g)}
              onDelete={() => deleteGoal(g)}
              onToggleComplete={() => toggleComplete(g)}
              onAddToCalendar={addToCalendar}
              onAskAmari={() => setChatGoal(g)}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={Target} title="No goals here yet" description="Create one to get moving." />
      )}

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={editingId ? "Edit Goal" : "New Goal"}>
        <form onSubmit={saveGoal} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Next action</label>
            <input
              value={form.next_action}
              onChange={(e) => setForm((f) => ({ ...f, next_action: e.target.value }))}
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Term</label>
              <select
                value={form.term}
                onChange={(e) => setForm((f) => ({ ...f, term: e.target.value as GoalTerm }))}
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              >
                <option value="long">Long-term</option>
                <option value="short">Short-term</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as GoalPriority }))}
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as GoalCategory }))}
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              >
                <option value="general">General</option>
                <option value="health">Health</option>
                <option value="business">Business</option>
                <option value="financial">Financial</option>
                <option value="spiritual">Spiritual</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              />
            </div>
          </div>
          <button type="submit" className="min-h-11 w-full rounded-xl bg-blue text-sm font-semibold text-white transition-colors hover:bg-blue/90">
            Save Goal
          </button>
        </form>
      </Sheet>

      <ChatSheet
        open={!!chatGoal}
        onClose={() => setChatGoal(null)}
        initialMessage={chatGoal ? `Help me make progress on my goal: "${chatGoal.title}"` : undefined}
      />
    </div>
  );
}

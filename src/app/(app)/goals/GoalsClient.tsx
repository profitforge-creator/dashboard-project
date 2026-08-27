"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Instrument_Serif } from "next/font/google";
import { Check, Edit2, Trash2, Sparkles, Target } from "lucide-react";
import type { Goal, GoalCategory, GoalPriority, GoalTerm, Task } from "@/lib/supabase/types";
import { EmptyState } from "@/components/EmptyState";
import { Sheet } from "@/components/Sheet";
import { ChatSheet } from "@/components/ChatSheet";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmationDialog";
import { cn, goalCountdown, formatTime12h } from "@/lib/utils";

const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: "italic" });

type Tab = "long" | "short" | "daily";

const TERM_LABEL: Record<GoalTerm, string> = { long: "Long-term", short: "Short-term" };

const emptyForm = {
  title: "",
  description: "",
  term: "long" as GoalTerm,
  category: "general" as GoalCategory,
  priority: "medium" as GoalPriority,
  next_action: "",
  deadline: "",
};

interface GoalsClientProps {
  goals: Goal[];
  todayTasks: Task[];
  today: string;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function GoalsClient({ goals, todayTasks, today }: GoalsClientProps) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const [tab, setTab] = useState<Tab>("short");
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [chatGoal, setChatGoal] = useState<Goal | null>(null);

  const [quickTitle, setQuickTitle] = useState("");
  const [quickDateTime, setQuickDateTime] = useState("");
  const [quickTime, setQuickTime] = useState("");

  const longGoals = useMemo(() => goals.filter((g) => g.term === "long" && g.status === "active"), [goals]);
  const shortGoals = useMemo(() => goals.filter((g) => g.term === "short" && g.status === "active"), [goals]);

  const upcoming = useMemo(() => {
    const withDeadline = goals.filter((g) => g.status === "active" && g.deadline);
    if (!withDeadline.length) return null;
    return [...withDeadline].sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0];
  }, [goals]);

  const lastCompleted = useMemo(() => {
    if (upcoming) return null;
    const completed = goals.filter((g) => g.status === "completed");
    if (!completed.length) return null;
    return [...completed].sort((a, b) => new Date(b.completed_at ?? b.created_at).getTime() - new Date(a.completed_at ?? a.created_at).getTime())[0];
  }, [goals, upcoming]);

  function openEdit(goal: Goal) {
    setEditingId(goal.id);
    setForm({
      title: goal.title,
      description: goal.description,
      term: goal.term,
      category: goal.category,
      priority: goal.priority,
      next_action: goal.next_action,
      deadline: goal.deadline ? new Date(goal.deadline).toISOString().slice(0, 16) : "",
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
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
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

  async function quickAddGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTitle.trim() || tab === "daily") return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("goals").insert({
      user_id: user!.id,
      title: quickTitle.trim(),
      description: "",
      term: tab,
      category: "general",
      priority: "medium",
      next_action: "",
      deadline: quickDateTime ? new Date(quickDateTime).toISOString() : null,
    });
    if (error) {
      toast("Could not add the goal.", "error");
      return;
    }
    toast("Goal added");
    setQuickTitle("");
    setQuickDateTime("");
    router.refresh();
  }

  async function quickAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("tasks").insert({
      user_id: user!.id,
      goal_id: null,
      title: quickTitle.trim(),
      description: "",
      category: "general",
      priority: "medium",
      task_date: today,
      task_time: quickTime || null,
      recurrence: "none",
      notes: "",
      sort_order: todayTasks.length,
      is_priority: false,
      completed: false,
    });
    if (error) {
      toast("Could not add the task.", "error");
      return;
    }
    toast("Task added");
    setQuickTitle("");
    setQuickTime("");
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
    const { error } = await supabase.from("goals").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", goal.id);
    if (error) return toast("Could not update the goal.", "error");
    await supabase.from("goal_progress_logs").insert({ goal_id: goal.id, user_id: goal.user_id, progress_pct: 100 });
    toast("Goal completed");
    router.refresh();
  }

  async function toggleTask(t: Task) {
    const supabase = createClient();
    await supabase.from("tasks").update({ completed: !t.completed }).eq("id", t.id);
    router.refresh();
  }

  async function deleteTask(t: Task) {
    const ok = await confirm({ title: "Delete this task?", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    const supabase = createClient();
    await supabase.from("tasks").delete().eq("id", t.id);
    toast("Task deleted");
    router.refresh();
  }

  const listGoals = tab === "long" ? longGoals : tab === "short" ? shortGoals : [];

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">Amari</p>
          <h1 className={cn(serif.className, "text-4xl text-text")}>Goals &amp; Schedule</h1>
        </div>
        {now && (
          <div className="hidden text-right text-xs text-text-secondary sm:block">
            <p>{now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</p>
            <p>{now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" })}</p>
          </div>
        )}
      </div>

      {now && (upcoming || lastCompleted) && (
        <HeroCard goal={upcoming ?? lastCompleted!} isCompleted={!upcoming} now={now} />
      )}

      <div className="grid grid-cols-3 gap-2.5">
        {[
          { value: "long" as Tab, label: "Long-term goals", count: longGoals.length },
          { value: "short" as Tab, label: "Short-term goals", count: shortGoals.length },
          { value: "daily" as Tab, label: "Daily schedule", count: todayTasks.length },
        ].map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "rounded-2xl border px-3 py-4 text-center transition-colors",
              tab === t.value ? "border-success bg-success text-bg" : "border-border bg-card text-text-secondary hover:border-border-strong"
            )}
          >
            <p className="text-sm font-semibold">{t.label}</p>
            <p className={cn("mt-1 text-xl font-bold", tab === t.value ? "text-bg" : "text-text")}>{t.count}</p>
          </button>
        ))}
      </div>

      <form onSubmit={tab === "daily" ? quickAddTask : quickAddGoal} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder={tab === "daily" ? "A task for today…" : `A ${tab}-term goal…`}
          className="min-h-11 flex-1 rounded-xl border border-border bg-card px-3.5 text-sm text-text outline-none focus:border-blue"
          required
        />
        {tab === "daily" ? (
          <input
            type="time"
            value={quickTime}
            onChange={(e) => setQuickTime(e.target.value)}
            className="min-h-11 rounded-xl border border-border bg-card px-3.5 text-sm text-text outline-none focus:border-blue"
          />
        ) : (
          <input
            type="datetime-local"
            value={quickDateTime}
            onChange={(e) => setQuickDateTime(e.target.value)}
            className="min-h-11 rounded-xl border border-border bg-card px-3.5 text-sm text-text outline-none focus:border-blue"
          />
        )}
        <button type="submit" className="min-h-11 rounded-xl bg-success px-5 text-sm font-semibold text-bg transition-colors hover:bg-success/90">
          {tab === "daily" ? "Add task" : "Add goal"}
        </button>
      </form>

      {tab === "daily" ? (
        todayTasks.length ? (
          <div className="flex flex-col gap-2">
            {todayTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                <button
                  onClick={() => toggleTask(t)}
                  aria-label="Toggle complete"
                  className={cn(
                    "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    t.completed ? "border-success bg-success text-bg" : "border-border-strong hover:border-success"
                  )}
                >
                  {t.completed && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </button>
                <p className={cn("min-w-0 flex-1 truncate text-[15px] font-medium text-text", t.completed && "text-text-secondary line-through")}>
                  {t.title}
                </p>
                <span className="flex-shrink-0 font-mono text-xs text-text-secondary">{t.task_time ? formatTime12h(t.task_time) : "Anytime"}</span>
                <button onClick={() => deleteTask(t)} aria-label="Delete task" className="flex-shrink-0 text-text-secondary transition-colors hover:text-error">
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Target} title="Nothing scheduled today" description="Add a task above to fill your day." />
        )
      ) : listGoals.length ? (
        <div className="flex flex-col gap-2.5">
          {listGoals.map((g) => (
            <GoalRow key={g.id} goal={g} now={now} onEdit={() => openEdit(g)} onDelete={() => deleteGoal(g)} onComplete={() => toggleComplete(g)} onAskAmari={() => setChatGoal(g)} />
          ))}
        </div>
      ) : (
        <EmptyState icon={Target} title={`No ${tab}-term goals yet`} description="Add one above to get moving." />
      )}

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Edit Goal">
        <form onSubmit={saveGoal} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Title</label>
            <input
              id="goal-title"
              name="title"
              type="text"
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
              id="goal-next-action"
              name="next_action"
              type="text"
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
                type="datetime-local"
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

function HeroCard({ goal, isCompleted, now }: { goal: Goal; isCompleted: boolean; now: Date }) {
  const cd = !isCompleted && goal.deadline ? goalCountdown(goal.deadline, goal.created_at, now) : null;
  const urgent = cd?.level === "urgent" || cd?.level === "overdue";
  const accent = isCompleted ? "success" : urgent ? "error" : "blue-light";
  const borderClass = isCompleted ? "border-success/40" : urgent ? "border-error/40" : "border-blue/30";
  const dotClass = isCompleted ? "bg-success" : urgent ? "bg-error" : "bg-blue-light";
  const textClass = isCompleted ? "text-success" : urgent ? "text-error" : "text-blue-light";
  const barClass = isCompleted ? "bg-success" : urgent ? "bg-error" : "bg-blue-light";

  return (
    <div className={cn("rounded-3xl border bg-card p-5", borderClass)} style={{ boxShadow: `0 0 32px -12px var(--color-${accent === "success" ? "success" : accent === "error" ? "error" : "blue-light"})` }}>
      <div className="flex items-center gap-2">
        <span className={cn("h-1.5 w-1.5 rounded-full", dotClass, urgent && "animate-pulse-glow")} />
        <span className={cn("text-xs font-semibold uppercase tracking-[0.2em]", textClass)}>{isCompleted ? "Last completed" : "Coming up"}</span>
      </div>
      <p className={cn(serif.className, "mt-2 text-3xl text-text")}>{goal.title}</p>
      <p className="mt-1 text-sm text-text-secondary">
        {TERM_LABEL[goal.term]}
        {isCompleted ? (
          <> · completed {goal.completed_at ? fmtDateTime(goal.completed_at) : ""}</>
        ) : (
          goal.deadline && (
            <>
              {" "}
              · due {fmtDateTime(goal.deadline)} · <span className={cn("font-semibold", textClass)}>{cd?.longLabel}</span>
            </>
          )
        )}
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-card-secondary">
        <div className={cn("h-full rounded-full transition-all duration-1000", barClass)} style={{ width: `${isCompleted ? 100 : cd?.timePct ?? 0}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-text-secondary">
        <span>{fmtDateTime(goal.created_at)}</span>
        <span>{isCompleted ? (goal.completed_at ? fmtDateTime(goal.completed_at) : "") : goal.deadline ? fmtDateTime(goal.deadline) : ""}</span>
      </div>
    </div>
  );
}

function GoalRow({
  goal,
  now,
  onEdit,
  onDelete,
  onComplete,
  onAskAmari,
}: {
  goal: Goal;
  now: Date | null;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onAskAmari: () => void;
}) {
  const cd = goal.deadline && now ? goalCountdown(goal.deadline, goal.created_at, now) : null;
  const urgent = cd?.level === "urgent" || cd?.level === "overdue";
  const pillClass = urgent ? "bg-error/15 text-error" : "bg-success/15 text-success";
  const barClass = urgent ? "bg-error" : "bg-success";

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <p className={cn(serif.className, "min-w-0 flex-1 truncate text-xl text-text")}>{goal.title}</p>
        {cd && <span className={cn("flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide", pillClass)}>{cd.pillLabel}</span>}
        <div className="flex flex-shrink-0 items-center gap-0.5">
          <button onClick={onComplete} aria-label="Mark complete" className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-success/10 hover:text-success">
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </button>
          <button onClick={onAskAmari} aria-label="Ask Amari" className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-blue/10 hover:text-blue-light">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <button onClick={onEdit} aria-label="Edit goal" className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-card-secondary hover:text-text">
            <Edit2 className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <button onClick={onDelete} aria-label="Delete goal" className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-error/10 hover:text-error">
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {cd && (
        <>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-card-secondary">
            <div className={cn("h-full rounded-full transition-all duration-1000", barClass)} style={{ width: `${cd.timePct}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-text-secondary">
            <span>{fmtDateTime(goal.created_at)}</span>
            <span>{fmtDateTime(goal.deadline!)}</span>
          </div>
        </>
      )}
    </div>
  );
}

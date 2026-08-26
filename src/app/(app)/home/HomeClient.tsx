"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Play, Flame, Timer, CheckCircle2, ListChecks } from "lucide-react";
import type { Profile, Goal, Task, FocusSession, Habit, HabitLog } from "@/lib/supabase/types";
import { AmariLifeCircle } from "@/components/AmariLifeCircle";
import { MetricCard } from "@/components/MetricCard";
import { TimelineChart } from "@/components/TimelineChart";
import { TaskRow } from "@/components/TaskRow";
import { FocusSessionCard } from "@/components/FocusSessionCard";
import { DeadlineCard } from "@/components/DeadlineCard";
import { HabitGrid } from "@/components/HabitGrid";
import { EmptyState } from "@/components/EmptyState";
import { ChatSheet } from "@/components/ChatSheet";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

interface HomeClientProps {
  profile: Profile;
  goals: Goal[];
  tasks: Task[];
  focusSecondsToday: number;
  activeSession: FocusSession | null;
  habits: Habit[];
  habitLogsToday: HabitLog[];
  recentHabitLogs: HabitLog[];
  lifeScore: number;
  today: string;
}

function last14Days(today: string): string[] {
  const days: string[] = [];
  const base = new Date(today + "T12:00:00");
  for (let i = 13; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

const CATEGORIES: { key: Goal["category"]; label: string }[] = [
  { key: "health", label: "Health" },
  { key: "business", label: "Business" },
  { key: "financial", label: "Financial" },
  { key: "spiritual", label: "Spiritual" },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

export function HomeClient({ profile, goals, tasks, focusSecondsToday, activeSession, habits, habitLogsToday, recentHabitLogs, lifeScore, today }: HomeClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [chatOpen, setChatOpen] = useState(false);

  const priorities = tasks.filter((t) => t.is_priority);
  const otherTasks = tasks.filter((t) => !t.is_priority);
  const tasksCompleted = tasks.filter((t) => t.completed).length;

  const nearestDeadlineGoal = useMemo(() => {
    const withDeadline = goals.filter((g) => g.deadline);
    return withDeadline.sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0] ?? null;
  }, [goals]);

  const timelineBlocks = useMemo(
    () => [
      ...tasks
        .filter((t) => t.task_time)
        .map((t) => {
          const [h, m] = t.task_time!.split(":").map(Number);
          const start = h + m / 60;
          return { startHour: start, endHour: start + 0.5, label: t.title, kind: "task" as const };
        }),
    ],
    [tasks]
  );

  async function toggleTask(task: Task) {
    const supabase = createClient();
    const { error } = await supabase.from("tasks").update({ completed: !task.completed }).eq("id", task.id);
    if (error) toast("Could not update the task.", "error");
    else router.refresh();
  }

  async function toggleHabit(habit: Habit) {
    const supabase = createClient();
    const existing = habitLogsToday.find((l) => l.habit_id === habit.id);
    if (existing) {
      await supabase.from("habit_logs").delete().eq("id", existing.id);
    } else {
      await supabase.from("habit_logs").insert({ habit_id: habit.id, user_id: profile.id, log_date: today, completed: true });
    }
    router.refresh();
  }

  const displayName = profile.full_name || profile.email?.split("@")[0] || "there";
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const categorySummaries = CATEGORIES.map((c) => {
    const inCategory = goals.filter((g) => g.category === c.key);
    return { ...c, count: inCategory.length };
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-semibold text-text">
            {greeting()}, {displayName}
          </p>
          <p className="text-sm text-text-secondary">{dateLabel}</p>
        </div>
        <Link
          href="/profile"
          aria-label="Profile"
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold text-text"
        >
          {displayName.slice(0, 1).toUpperCase()}
        </Link>
      </div>

      <div className="flex flex-col items-center gap-4 py-2">
        <AmariLifeCircle score={lifeScore} />
        <div className="grid w-full grid-cols-2 gap-3">
          <MetricCard icon={Timer} label="Focus time" value={Math.round(focusSecondsToday / 60)} suffix="m" />
          <MetricCard icon={CheckCircle2} label="Tasks done" value={tasksCompleted} suffix={`/${tasks.length}`} />
        </div>
      </div>

      <TimelineChart blocks={timelineBlocks} />

      {activeSession && (
        <FocusSessionCard
          session={activeSession}
          elapsedSeconds={activeSession.actual_seconds}
          onPause={() => router.push("/focus")}
          onResume={() => router.push("/focus")}
          onEnd={() => router.push("/focus")}
        />
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
          <ListChecks className="h-4 w-4 text-blue-light" strokeWidth={2} /> Today&apos;s priorities
        </h2>
        {priorities.length ? (
          <div className="flex flex-col gap-2">
            {priorities.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={() => toggleTask(t)} onEdit={() => router.push("/goals")} onDelete={() => {}} />
            ))}
          </div>
        ) : (
          <EmptyState icon={ListChecks} title="No priorities set for today" description="Mark a task as a priority from the Goals page." />
        )}
      </section>

      {otherTasks.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-text">Additional tasks</h2>
          <div className="flex flex-col gap-2">
            {otherTasks.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={() => toggleTask(t)} onEdit={() => router.push("/goals")} onDelete={() => {}} />
            ))}
          </div>
        </section>
      )}

      {nearestDeadlineGoal && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-text">Upcoming deadline</h2>
          <DeadlineCard goal={nearestDeadlineGoal} />
        </section>
      )}

      {habits.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <Flame className="h-4 w-4 text-blue-light" strokeWidth={2} /> Habits
          </h2>
          {habits.map((h) => {
            const days = last14Days(today).map((date) => ({
              date,
              completed: recentHabitLogs.some((l) => l.habit_id === h.id && l.log_date === date && l.completed),
            }));
            return (
              <button key={h.id} onClick={() => toggleHabit(h)} className="block w-full text-left">
                <HabitGrid name={h.name} days={days} />
              </button>
            );
          })}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-text">Life areas</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categorySummaries.map((c) => (
            <Link
              key={c.key}
              href="/goals"
              className="rounded-2xl border border-border bg-card p-4 text-center transition-colors hover:border-border-strong"
            >
              <p className="text-lg font-semibold text-text">{c.count}</p>
              <p className="text-xs text-text-secondary">{c.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Spacer so the fixed action bar below never overlaps the last section */}
      <div className="h-24 lg:h-20" aria-hidden="true" />

      <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-0 right-0 z-30 mx-auto flex max-w-3xl gap-2 px-4 sm:px-6 lg:bottom-4 lg:left-64 lg:px-8">
        <button
          onClick={() => setChatOpen(true)}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue text-[15px] font-semibold text-white shadow-lg shadow-blue/20 backdrop-blur transition-colors hover:bg-blue/90"
        >
          <MessageCircle className="h-4.5 w-4.5" strokeWidth={2} /> Chat with Amari
        </button>
        <Link
          href="/focus"
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card-secondary px-5 text-[15px] font-semibold text-text shadow-lg backdrop-blur transition-colors hover:bg-card"
        >
          <Play className="h-4 w-4" strokeWidth={2} /> Start Focus
        </Link>
      </div>

      <ChatSheet open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}

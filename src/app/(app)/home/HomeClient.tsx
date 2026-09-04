"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Flame, Timer, CheckCircle2, ListChecks, Dumbbell, HeartPulse, Pill, Target, Megaphone, Wallet, Settings } from "lucide-react";
import type { Profile, Goal, Task, FocusSession, Habit, HabitLog, HealthLog } from "@/lib/supabase/types";
import { AmariLifeCircle } from "@/components/AmariLifeCircle";
import { MetricCard } from "@/components/MetricCard";
import { TimelineChart } from "@/components/TimelineChart";
import { TaskRow } from "@/components/TaskRow";
import { FocusSessionCard } from "@/components/FocusSessionCard";
import { DeadlineCard } from "@/components/DeadlineCard";
import { HabitGrid } from "@/components/HabitGrid";
import { EmptyState } from "@/components/EmptyState";
import { QuickAdd } from "@/components/QuickAdd";
import { NextTaskSquare } from "@/components/NextTaskSquare";
import { ModuleCard } from "@/components/ModuleCard";
import { BrandMark } from "@/components/BrandMark";
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
  financeRunwayDays: number | null;
  financeLiquidCash: number;
  healthToday: HealthLog | null;
  activeSupplementCount: number;
  supplementsTakenToday: number;
  hasRoutine: boolean;
  exerciseCount: number;
  exercisesCompletedToday: number;
  totalFollowers: number;
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

export function HomeClient({
  profile,
  goals,
  tasks,
  focusSecondsToday,
  activeSession,
  habits,
  habitLogsToday,
  recentHabitLogs,
  lifeScore,
  today,
  financeRunwayDays,
  financeLiquidCash,
  healthToday,
  activeSupplementCount,
  supplementsTakenToday,
  hasRoutine,
  exerciseCount,
  exercisesCompletedToday,
  totalFollowers,
}: HomeClientProps) {
  const router = useRouter();
  const toast = useToast();

  const priorities = tasks.filter((t) => t.is_priority);
  const otherTasks = tasks.filter((t) => !t.is_priority);
  const tasksCompleted = tasks.filter((t) => t.completed).length;

  const nextTask = useMemo(() => {
    const incomplete = tasks.filter((t) => !t.completed);
    const nowStr = new Date().toTimeString().slice(0, 5);
    const upcoming = incomplete
      .filter((t) => !t.task_time || t.task_time >= nowStr)
      .sort((a, b) => {
        if (!a.task_time) return 1;
        if (!b.task_time) return -1;
        return a.task_time.localeCompare(b.task_time);
      });
    return upcoming[0] ?? incomplete[0] ?? null;
  }, [tasks]);

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
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }).toUpperCase();

  const categorySummaries = CATEGORIES.map((c) => {
    const inCategory = goals.filter((g) => g.category === c.key);
    return { ...c, count: inCategory.length };
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-blue/15 text-blue-light">
            <BrandMark size={18} />
          </span>
          <div>
            <p className="text-2xl font-semibold leading-tight text-text">
              {greeting()}, {displayName}
            </p>
            <p className="label-mono mt-1 text-text-secondary">{dateLabel}</p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <QuickAdd />
          <Link
            href="/profile"
            aria-label="Profile"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-border bg-card text-text-secondary transition-colors hover:text-text"
          >
            <Settings className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 py-2">
        <AmariLifeCircle score={lifeScore} />
        <div className="grid w-full grid-cols-2 gap-3">
          <MetricCard icon={Timer} label="Focus time" value={Math.round(focusSecondsToday / 60)} suffix="m" />
          <MetricCard icon={CheckCircle2} label="Tasks done" value={tasksCompleted} suffix={`/${tasks.length}`} />
        </div>
      </div>

      <NextTaskSquare task={nextTask} />

      <TimelineChart blocks={timelineBlocks} />

      <section className="space-y-3">
        <ModuleCard
          href="/fitness"
          icon={Dumbbell}
          index="01"
          label="Train"
          stat={hasRoutine ? `${exercisesCompletedToday}/${exerciseCount} done today` : "—"}
          sub="Workouts, splits, sessions"
          visual="sparkline"
          accent={hasRoutine && exerciseCount > 0 && exercisesCompletedToday === exerciseCount ? "blue" : "muted"}
          hero
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ModuleCard
            href="/health"
            icon={Pill}
            index="02"
            label="Fuel"
            stat={activeSupplementCount ? `${supplementsTakenToday}/${activeSupplementCount} taken` : "—"}
            sub="Macros, water, supplements"
            visual="particles"
            accent={activeSupplementCount > 0 && supplementsTakenToday === activeSupplementCount ? "blue" : "muted"}
          />
          <ModuleCard
            href="/health"
            icon={HeartPulse}
            index="03"
            label="Vitals"
            stat={healthToday?.steps != null ? `${healthToday.steps.toLocaleString()} steps` : "—"}
            sub="Recovery, sleep, steps"
            visual="radar"
            accent={healthToday ? "blue" : "muted"}
          />
          <ModuleCard
            href="/focus"
            icon={Target}
            index="04"
            label="Peak"
            stat={`${Math.round(focusSecondsToday / 60)}m today`}
            sub="Daily readiness"
            visual="dotmatrix"
            accent={activeSession ? "warning" : focusSecondsToday > 0 ? "blue" : "muted"}
          />
          <ModuleCard
            href="/business"
            icon={Megaphone}
            index="05"
            label="Brand"
            stat={totalFollowers ? `${totalFollowers.toLocaleString()} followers` : "—"}
            sub="Content, reach, growth"
            visual="emblem"
            accent={totalFollowers > 0 ? "violet" : "muted"}
          />
          <ModuleCard
            href="/finance"
            icon={Wallet}
            index="06"
            label="Finance"
            stat={
              financeRunwayDays === null
                ? "—"
                : `${financeRunwayDays}d runway · ${financeLiquidCash.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`
            }
            sub="Net worth, subscriptions"
            visual="bars"
            accent={financeRunwayDays !== null && financeRunwayDays < 14 ? "error" : financeRunwayDays !== null && financeRunwayDays < 30 ? "warning" : "blue"}
          />
        </div>
      </section>

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
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
              <Flame className="h-4 w-4 text-blue-light" strokeWidth={2} /> Habits
            </h2>
            <Link href="/habits" className="text-xs font-semibold text-blue-light">
              Manage
            </Link>
          </div>
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

      <Link
        href="/focus"
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue text-[15px] font-semibold text-bg transition-colors hover:bg-blue/90"
      >
        <Play className="h-4 w-4" strokeWidth={2} /> Start Focus
      </Link>
    </div>
  );
}

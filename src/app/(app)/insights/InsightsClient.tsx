"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Timer, CheckCircle2, Flame, Briefcase, Wallet, Heart, Trophy, Sparkles, Smartphone, Moon } from "lucide-react";
import { SegmentedControl } from "@/components/SegmentedControl";
import { InsightCard } from "@/components/InsightCard";
import { SkeletonState } from "@/components/SkeletonState";
import { createClient } from "@/lib/supabase/client";
import type { Goal, FocusSession, Task, HabitLog, Habit } from "@/lib/supabase/types";

type Period = "day" | "week" | "month" | "year";

const PERIOD_DAYS: Record<Period, number> = { day: 1, week: 7, month: 30, year: 365 };

export function InsightsClient() {
  const [period, setPeriod] = useState<Period>("week");
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [recLoading, setRecLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const since = new Date();
      since.setDate(since.getDate() - PERIOD_DAYS[period]);

      const [sessionsRes, tasksRes, goalsRes, habitsRes, habitLogsRes] = await Promise.all([
        supabase.from("focus_sessions").select("*").eq("user_id", user.id).gte("started_at", since.toISOString()),
        supabase.from("tasks").select("*").eq("user_id", user.id).gte("task_date", since.toISOString().slice(0, 10)),
        supabase.from("goals").select("*").eq("user_id", user.id),
        supabase.from("habits").select("*").eq("user_id", user.id),
        supabase.from("habit_logs").select("*").eq("user_id", user.id).gte("log_date", since.toISOString().slice(0, 10)),
      ]);
      if (cancelled) return;
      setSessions((sessionsRes.data ?? []) as FocusSession[]);
      setTasks((tasksRes.data ?? []) as Task[]);
      setGoals((goalsRes.data ?? []) as Goal[]);
      setHabits((habitsRes.data ?? []) as Habit[]);
      setHabitLogs((habitLogsRes.data ?? []) as HabitLog[]);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [period]);

  async function getRecommendation() {
    setRecLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Based on my recent activity — ${sessions.length} focus sessions, ${tasks.filter((t) => t.completed).length}/${tasks.length} tasks completed, ${goals.filter((g) => g.status === "active").length} active goals — give me one concrete, specific recommendation for the coming ${period}.`,
        }),
      });
      const data = await res.json();
      setRecommendation(data.text ?? null);
    } catch {
      setRecommendation("Couldn't reach Amari for a recommendation right now.");
    } finally {
      setRecLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-semibold text-text">Insights</h1>
        <SkeletonState rows={4} />
      </div>
    );
  }

  const focusMinutes = Math.round(sessions.reduce((sum, s) => sum + s.actual_seconds, 0) / 60);
  const completedTasks = tasks.filter((t) => t.completed).length;
  const taskRate = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const byCategory = (cat: Goal["category"]) => {
    const inCat = goals.filter((g) => g.category === cat);
    const completed = inCat.filter((g) => g.status === "completed").length;
    return { total: inCat.length, completed };
  };
  const business = byCategory("business");
  const financial = byCategory("financial");
  const health = byCategory("health");
  const spiritual = byCategory("spiritual");

  const habitConsistency = habits.length
    ? Math.round((habitLogs.filter((l) => l.completed).length / (habits.length * PERIOD_DAYS[period])) * 100)
    : 0;

  const dayTotals = new Map<string, number>();
  for (const s of sessions) {
    const day = s.started_at.slice(0, 10);
    dayTotals.set(day, (dayTotals.get(day) ?? 0) + s.actual_seconds);
  }
  let bestDay: { day: string; seconds: number } | null = null;
  for (const [day, seconds] of dayTotals) {
    if (!bestDay || seconds > bestDay.seconds) bestDay = { day, seconds };
  }

  const longestSession = sessions.reduce((max, s) => Math.max(max, s.actual_seconds), 0);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">Insights</h1>
        <SegmentedControl
          value={period}
          onChange={setPeriod}
          options={[
            { value: "day", label: "Day" },
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
            { value: "year", label: "Year" },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <InsightCard icon={Timer} title="Focus time" value={`${focusMinutes}m`} />
        <InsightCard icon={CheckCircle2} title="Task completion" value={`${taskRate}%`} />
        <InsightCard icon={Flame} title="Habit consistency" value={`${habitConsistency}%`} />
        <InsightCard icon={Briefcase} title="Business goals" value={`${business.completed}/${business.total}`} />
        <InsightCard icon={Wallet} title="Financial goals" value={`${financial.completed}/${financial.total}`} />
        <InsightCard icon={Heart} title="Health goals" value={`${health.completed}/${health.total}`} />
        <InsightCard icon={Sparkles} title="Faith consistency" value={`${spiritual.completed}/${spiritual.total}`} />
        <InsightCard
          icon={Trophy}
          title="Personal record"
          value={longestSession ? `${Math.round(longestSession / 60)}m` : "—"}
          trend={bestDay ? { direction: "up", label: `Best: ${new Date(bestDay.day).toLocaleDateString(undefined, { weekday: "short" })}` } : undefined}
        />
        <InsightCard icon={TrendingUp} title="Life Score trend" value={tasks.length || sessions.length ? "Tracking" : "No data yet"} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InsightCard icon={Smartphone} title="Screen time" value="Not connected">
          <p className="text-xs text-text-secondary">Connect a health integration from Profile to see this trend.</p>
        </InsightCard>
        <InsightCard icon={Moon} title="Sleep" value="Not connected">
          <p className="text-xs text-text-secondary">Connect a health integration from Profile to see this trend.</p>
        </InsightCard>
      </div>

      <div className="rounded-2xl border border-blue/25 bg-blue/5 p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <Sparkles className="h-4 w-4 text-blue-light" strokeWidth={2} /> Amari&apos;s take
          </h2>
          <button
            onClick={getRecommendation}
            disabled={recLoading}
            className="rounded-full border border-blue/40 bg-blue/10 px-3 py-1.5 text-xs font-semibold text-blue-light disabled:opacity-50"
          >
            {recLoading ? "Thinking…" : "Get recommendation"}
          </button>
        </div>
        {recommendation && <p className="mt-3 text-sm leading-relaxed text-text">{recommendation}</p>}
      </div>
    </div>
  );
}

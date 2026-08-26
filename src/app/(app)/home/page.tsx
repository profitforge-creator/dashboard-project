import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";
import { HomeClient } from "./HomeClient";
import type { Goal, Task, FocusSession, Habit, HabitLog } from "@/lib/supabase/types";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const today = todayISO();

  const [profileRes, goalsRes, tasksRes, sessionsRes, activeSessionRes, habitsRes, habitLogsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase.from("goals").select("*").eq("user_id", user!.id).eq("status", "active").order("deadline", { ascending: true, nullsFirst: false }),
    supabase.from("tasks").select("*").eq("user_id", user!.id).eq("task_date", today).order("task_time", { ascending: true, nullsFirst: false }),
    supabase.from("focus_sessions").select("*").eq("user_id", user!.id).gte("started_at", `${today}T00:00:00`).order("started_at", { ascending: true }),
    supabase.from("focus_sessions").select("*").eq("user_id", user!.id).in("status", ["running", "paused"]).order("started_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("habits").select("*").eq("user_id", user!.id).order("created_at", { ascending: true }),
    supabase.from("habit_logs").select("*").eq("user_id", user!.id).eq("log_date", today),
  ]);

  const goals = (goalsRes.data ?? []) as Goal[];
  const tasks = (tasksRes.data ?? []) as Task[];
  const sessionsToday = (sessionsRes.data ?? []) as FocusSession[];
  const activeSession = activeSessionRes.data as FocusSession | null;
  const habits = (habitsRes.data ?? []) as Habit[];
  const habitLogsToday = (habitLogsRes.data ?? []) as HabitLog[];

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  const rangeStart = fourteenDaysAgo.toISOString().slice(0, 10);
  const { data: recentLogsData } = habits.length
    ? await supabase
        .from("habit_logs")
        .select("*")
        .eq("user_id", user!.id)
        .gte("log_date", rangeStart)
        .in(
          "habit_id",
          habits.map((h) => h.id)
        )
    : { data: [] as HabitLog[] };
  const recentHabitLogs = (recentLogsData ?? []) as HabitLog[];

  const focusSecondsToday = sessionsToday.reduce((sum, s) => sum + s.actual_seconds, 0);
  const tasksCompleted = tasks.filter((t) => t.completed).length;
  const taskCompletionRatio = tasks.length ? (tasksCompleted / tasks.length) * 100 : 60;
  const focusRatio = Math.min(100, (focusSecondsToday / (120 * 60)) * 100);
  const habitConsistency = habits.length ? (habitLogsToday.filter((l) => l.completed).length / habits.length) * 100 : 100;

  let goalProgressAvg = 60;
  if (goals.length) {
    const goalIds = goals.map((g) => g.id);
    const { data: latestLogs } = await supabase
      .from("goal_progress_logs")
      .select("goal_id, progress_pct, created_at")
      .in("goal_id", goalIds)
      .order("created_at", { ascending: false });
    const seen = new Set<string>();
    const latestByGoal: number[] = [];
    for (const log of latestLogs ?? []) {
      if (seen.has(log.goal_id)) continue;
      seen.add(log.goal_id);
      latestByGoal.push(log.progress_pct);
    }
    if (latestByGoal.length) {
      goalProgressAvg = latestByGoal.reduce((a, b) => a + b, 0) / latestByGoal.length;
    }
  }

  const lifeScore = Math.round(
    taskCompletionRatio * 0.3 + focusRatio * 0.3 + goalProgressAvg * 0.25 + habitConsistency * 0.15
  );

  return (
    <HomeClient
      profile={profileRes.data!}
      goals={goals}
      tasks={tasks}
      focusSecondsToday={focusSecondsToday}
      activeSession={activeSession}
      habits={habits}
      habitLogsToday={habitLogsToday}
      recentHabitLogs={recentHabitLogs}
      lifeScore={lifeScore}
      today={today}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";
import { GoalsClient } from "./GoalsClient";
import type { Goal, Task } from "@/lib/supabase/types";

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [goalsRes, progressRes, todayTasksRes] = await Promise.all([
    supabase.from("goals").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
    supabase.from("goal_progress_logs").select("goal_id, progress_pct, created_at").eq("user_id", user!.id).order("created_at", { ascending: false }),
    supabase.from("tasks").select("*").eq("user_id", user!.id).eq("task_date", todayISO()),
  ]);

  const goals = (goalsRes.data ?? []) as Goal[];
  const progressByGoal: Record<string, number> = {};
  for (const log of progressRes.data ?? []) {
    if (!(log.goal_id in progressByGoal)) progressByGoal[log.goal_id] = log.progress_pct;
  }
  for (const g of goals) {
    if (!(g.id in progressByGoal)) progressByGoal[g.id] = g.status === "completed" ? 100 : 0;
  }

  const todayGoalIds = new Set(((todayTasksRes.data ?? []) as Task[]).map((t) => t.goal_id).filter(Boolean));

  return <GoalsClient goals={goals} progressByGoal={progressByGoal} todayGoalIds={[...todayGoalIds] as string[]} />;
}

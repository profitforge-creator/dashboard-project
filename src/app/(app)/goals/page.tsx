import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";
import { GoalsClient } from "./GoalsClient";
import type { Goal, Task } from "@/lib/supabase/types";

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [goalsRes, todayTasksRes] = await Promise.all([
    supabase.from("goals").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
    supabase.from("tasks").select("*").eq("user_id", user!.id).eq("task_date", todayISO()).order("sort_order", { ascending: true }),
  ]);

  const goals = (goalsRes.data ?? []) as Goal[];
  const todayTasks = (todayTasksRes.data ?? []) as Task[];

  return <GoalsClient goals={goals} todayTasks={todayTasks} today={todayISO()} />;
}

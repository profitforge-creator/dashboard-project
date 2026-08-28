import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";
import { HabitsClient } from "./HabitsClient";
import type { Habit, HabitLog } from "@/lib/supabase/types";

export default async function HabitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const today = todayISO();

  const since = new Date();
  since.setDate(since.getDate() - 55);

  const [habitsRes, logsRes] = await Promise.all([
    supabase.from("habits").select("*").eq("user_id", user!.id).order("created_at", { ascending: true }),
    supabase.from("habit_logs").select("*").eq("user_id", user!.id).gte("log_date", since.toISOString().slice(0, 10)),
  ]);

  return <HabitsClient habits={(habitsRes.data ?? []) as Habit[]} logs={(logsRes.data ?? []) as HabitLog[]} today={today} />;
}

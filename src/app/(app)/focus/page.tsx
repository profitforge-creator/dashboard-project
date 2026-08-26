import { createClient } from "@/lib/supabase/server";
import { FocusClient } from "./FocusClient";
import type { FocusSession, Goal } from "@/lib/supabase/types";

export default async function FocusPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [activeRes, historyRes, goalsRes, weekRes] = await Promise.all([
    supabase.from("focus_sessions").select("*").eq("user_id", user!.id).in("status", ["running", "paused"]).order("started_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("focus_sessions").select("*").eq("user_id", user!.id).eq("status", "completed").order("started_at", { ascending: false }).limit(10),
    supabase.from("goals").select("*").eq("user_id", user!.id).eq("status", "active").order("created_at", { ascending: false }),
    supabase.from("focus_sessions").select("actual_seconds, status").eq("user_id", user!.id).gte("started_at", weekAgo.toISOString()),
  ]);

  const weekSessions = weekRes.data ?? [];
  const weeklyFocusSeconds = weekSessions.filter((s) => s.status === "completed").reduce((sum, s) => sum + s.actual_seconds, 0);
  const weeklyCompletedCount = weekSessions.filter((s) => s.status === "completed").length;

  return (
    <FocusClient
      activeSession={activeRes.data as FocusSession | null}
      history={(historyRes.data ?? []) as FocusSession[]}
      goals={(goalsRes.data ?? []) as Goal[]}
      weeklyFocusSeconds={weeklyFocusSeconds}
      weeklyCompletedCount={weeklyCompletedCount}
    />
  );
}

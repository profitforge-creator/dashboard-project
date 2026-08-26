import { createClient } from "@/lib/supabase/server";
import { ProfileClient } from "./ProfileClient";
import type { Profile, IntegrationConnection } from "@/lib/supabase/types";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileRes, integrationsRes, goalsCountRes, focusSecondsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase.from("integration_connections").select("*").eq("user_id", user!.id),
    supabase.from("goals").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("status", "completed"),
    supabase.from("focus_sessions").select("actual_seconds").eq("user_id", user!.id).eq("status", "completed"),
  ]);

  const totalFocusMinutes = Math.round(
    (focusSecondsRes.data ?? []).reduce((sum, s) => sum + s.actual_seconds, 0) / 60
  );

  return (
    <ProfileClient
      profile={profileRes.data as Profile}
      integrations={(integrationsRes.data ?? []) as IntegrationConnection[]}
      completedGoals={goalsCountRes.count ?? 0}
      totalFocusMinutes={totalFocusMinutes}
      userEmail={user!.email ?? ""}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";
import { HealthClient } from "./HealthClient";
import type { HealthLog, Supplement, SupplementLog, HealthSyncToken } from "@/lib/supabase/types";

export default async function HealthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [logsRes, supplementsRes, supplementLogsRes, tokenRes] = await Promise.all([
    supabase.from("health_logs").select("*").eq("user_id", user!.id).gte("log_date", since.toISOString().slice(0, 10)).order("log_date", { ascending: true }),
    supabase.from("supplements").select("*").eq("user_id", user!.id).order("created_at", { ascending: true }),
    supabase.from("supplement_logs").select("*").eq("user_id", user!.id).gte("log_date", since.toISOString().slice(0, 10)),
    supabase.from("health_sync_tokens").select("*").eq("user_id", user!.id).maybeSingle(),
  ]);

  return (
    <HealthClient
      logs={(logsRes.data ?? []) as HealthLog[]}
      supplements={(supplementsRes.data ?? []) as Supplement[]}
      supplementLogs={(supplementLogsRes.data ?? []) as SupplementLog[]}
      syncToken={(tokenRes.data ?? null) as HealthSyncToken | null}
      today={todayISO()}
    />
  );
}

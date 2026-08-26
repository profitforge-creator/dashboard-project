import { createClient } from "@/lib/supabase/server";
import { BusinessClient } from "./BusinessClient";
import type { BusinessIdea, BusinessApp, BusinessModel, SocialAccount, SocialMetricsLog } from "@/lib/supabase/types";

export default async function BusinessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const since = new Date();
  since.setDate(since.getDate() - 60);

  const [ideasRes, appsRes, modelsRes, accountsRes, metricsRes] = await Promise.all([
    supabase.from("business_ideas").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
    supabase.from("business_apps").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
    supabase.from("business_models").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
    supabase.from("social_accounts").select("*").eq("user_id", user!.id).order("created_at", { ascending: true }),
    supabase.from("social_metrics_logs").select("*").eq("user_id", user!.id).gte("log_date", since.toISOString().slice(0, 10)).order("log_date", { ascending: true }),
  ]);

  return (
    <BusinessClient
      ideas={(ideasRes.data ?? []) as BusinessIdea[]}
      apps={(appsRes.data ?? []) as BusinessApp[]}
      models={(modelsRes.data ?? []) as BusinessModel[]}
      accounts={(accountsRes.data ?? []) as SocialAccount[]}
      metrics={(metricsRes.data ?? []) as SocialMetricsLog[]}
    />
  );
}

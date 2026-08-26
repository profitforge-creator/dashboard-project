import { createClient } from "@/lib/supabase/server";
import { FinanceClient } from "./FinanceClient";
import type { Transaction, BudgetPeriod, BudgetCategoryAllocation, FinancialGoal } from "@/lib/supabase/types";

function monthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
}

export default async function FinancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { start, end } = monthRange();
  const startISO = start.toISOString().slice(0, 10);
  const endISO = end.toISOString().slice(0, 10);

  const [txRes, periodRes, goalsRes] = await Promise.all([
    supabase.from("transactions").select("*").eq("user_id", user!.id).order("occurred_at", { ascending: false }).limit(500),
    supabase.from("budget_periods").select("*").eq("user_id", user!.id).eq("starts_on", startISO).eq("ends_on", endISO).maybeSingle(),
    supabase.from("financial_goals").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
  ]);

  let period = periodRes.data as BudgetPeriod | null;
  let categories: BudgetCategoryAllocation[] = [];

  if (!period) {
    const { data: created } = await supabase
      .from("budget_periods")
      .insert({ user_id: user!.id, starts_on: startISO, ends_on: endISO, planned_income: 0 })
      .select()
      .single();
    period = created as BudgetPeriod;
  }

  if (period) {
    const { data: catData } = await supabase.from("budget_categories").select("*").eq("budget_period_id", period.id);
    categories = (catData ?? []) as BudgetCategoryAllocation[];
  }

  return (
    <FinanceClient
      transactions={(txRes.data ?? []) as Transaction[]}
      period={period}
      categories={categories}
      financialGoals={(goalsRes.data ?? []) as FinancialGoal[]}
    />
  );
}

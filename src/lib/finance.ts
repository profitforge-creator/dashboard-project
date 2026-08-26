import type { BudgetCategoryKey, Transaction, TransactionType } from "@/lib/supabase/types";

export const DAYS_PER_MONTH = 30.4375;

const OUTFLOW_TYPES: TransactionType[] = [
  "expense",
  "savings_contribution",
  "investment_contribution",
  "debt_payment",
  "recurring_bill",
];
const INFLOW_TYPES: TransactionType[] = ["income", "refund"];
const SPENDING_TYPES: TransactionType[] = ["expense", "debt_payment", "recurring_bill"];

/**
 * Liquid cash is derived entirely from the transaction ledger (no
 * separate "starting balance" field exists yet): inflows minus
 * outflows, all-time. Transfers are assumed to move money between the
 * user's own accounts and are excluded (net-zero on total cash).
 */
export function computeLiquidCash(transactions: Transaction[]): number {
  let total = 0;
  for (const t of transactions) {
    if (INFLOW_TYPES.includes(t.type)) total += t.amount;
    else if (OUTFLOW_TYPES.includes(t.type)) total -= t.amount;
  }
  return round2(total);
}

/** Monthly baseline = sum of transactions marked as recurring baseline-survival costs. */
export function computeMonthlyBaseline(transactions: Transaction[]): number {
  const total = transactions
    .filter((t) => t.is_baseline_survival && t.is_recurring)
    .reduce((sum, t) => sum + t.amount, 0);
  return round2(total);
}

export function computeDailyBaselineBurn(monthlyBaseline: number): number {
  return round2(monthlyBaseline / DAYS_PER_MONTH);
}

/** Safe division: returns null (never Infinity/NaN) when the daily burn is zero or negative. */
export function computeRunwayDays(liquidCash: number, dailyBurn: number): number | null {
  if (!Number.isFinite(dailyBurn) || dailyBurn <= 0) return null;
  if (liquidCash <= 0) return 0;
  return round2(liquidCash / dailyBurn);
}

export function runwayDate(runwayDays: number | null, from: Date = new Date()): Date | null {
  if (runwayDays === null) return null;
  const d = new Date(from);
  d.setDate(d.getDate() + Math.floor(runwayDays));
  return d;
}

/** Recent actual daily burn = eligible spending in the lookback window / number of days. */
export function computeRecentActualDailyBurn(transactions: Transaction[], lookbackDays: number, now: Date = new Date()): number {
  if (lookbackDays <= 0) return 0;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - lookbackDays);
  cutoff.setHours(0, 0, 0, 0);
  // Upper bound is end-of-day, not the exact instant "now": a transaction
  // logged "today" (often stamped at a fixed time of day, e.g. noon) must
  // never be excluded just because the clock hasn't reached that time yet.
  const upperBound = new Date(now);
  upperBound.setHours(23, 59, 59, 999);
  const total = transactions
    .filter((t) => SPENDING_TYPES.includes(t.type) && new Date(t.occurred_at) >= cutoff && new Date(t.occurred_at) <= upperBound)
    .reduce((sum, t) => sum + t.amount, 0);
  return round2(total / lookbackDays);
}

export interface BurnRates {
  monthlyBaseline: number;
  dailyBaselineBurn: number;
  recentActualDailyBurn: number;
  liquidCash: number;
  baselineRunwayDays: number | null;
  actualRunwayDays: number | null;
  baselineRunwayDate: Date | null;
  actualRunwayDate: Date | null;
}

export function computeBurnRates(transactions: Transaction[], lookbackDays = 30, now: Date = new Date()): BurnRates {
  const liquidCash = computeLiquidCash(transactions);
  const monthlyBaseline = computeMonthlyBaseline(transactions);
  const dailyBaselineBurn = computeDailyBaselineBurn(monthlyBaseline);
  const recentActualDailyBurn = computeRecentActualDailyBurn(transactions, lookbackDays, now);
  const baselineRunwayDays = computeRunwayDays(liquidCash, dailyBaselineBurn);
  const actualRunwayDays = computeRunwayDays(liquidCash, recentActualDailyBurn);
  return {
    monthlyBaseline,
    dailyBaselineBurn,
    recentActualDailyBurn,
    liquidCash,
    baselineRunwayDays,
    actualRunwayDays,
    baselineRunwayDate: runwayDate(baselineRunwayDays, now),
    actualRunwayDate: runwayDate(actualRunwayDays, now),
  };
}

export interface ScenarioAdjustment {
  incomeDelta?: number;
  monthlySpendingDelta?: number; // positive = more spending, negative = less
  oneTimeExpense?: number;
}

export function computeScenarioRunway(base: BurnRates, adjustment: ScenarioAdjustment): { runwayDays: number | null; runwayDate: Date | null; monthlyDelta: number } {
  const dailySpendingDelta = (adjustment.monthlySpendingDelta ?? 0) / DAYS_PER_MONTH;
  const dailyIncomeDelta = (adjustment.incomeDelta ?? 0) / DAYS_PER_MONTH;
  const scenarioDailyBurn = base.recentActualDailyBurn + dailySpendingDelta - dailyIncomeDelta;
  const adjustedCash = base.liquidCash - (adjustment.oneTimeExpense ?? 0);
  const days = computeRunwayDays(adjustedCash, scenarioDailyBurn);
  return {
    runwayDays: days,
    runwayDate: runwayDate(days),
    monthlyDelta: round2((adjustment.incomeDelta ?? 0) - (adjustment.monthlySpendingDelta ?? 0) - (adjustment.oneTimeExpense ?? 0) / DAYS_PER_MONTH * DAYS_PER_MONTH),
  };
}

/** Zero-based budget: income - (expenses + savings + investments + debt) should net to zero (a positive remainder is unallocated, not a problem). */
export function computeZeroBasedRemainder(plannedIncome: number, categoryAllocations: Record<BudgetCategoryKey, number>): number {
  const allocated = Object.values(categoryAllocations).reduce((sum, v) => sum + v, 0);
  return round2(plannedIncome - allocated);
}

export function computeCategoryActuals(transactions: Transaction[], periodStart: Date, periodEnd: Date): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const t of transactions) {
    const d = new Date(t.occurred_at);
    if (d < periodStart || d > periodEnd) continue;
    if (t.type === "income" || t.type === "transfer" || t.type === "refund") continue;
    totals[t.category] = (totals[t.category] ?? 0) + t.amount;
  }
  return totals;
}

/** Required contribution to hit a goal by its deadline. Returns null if there's no deadline or it's already past. */
export function computeRequiredContribution(
  targetAmount: number,
  currentAmount: number,
  deadline: string | null,
  now: Date = new Date()
): { weekly: number; monthly: number } | null {
  if (!deadline) return null;
  const remaining = Math.max(targetAmount - currentAmount, 0);
  const deadlineDate = new Date(deadline);
  const msRemaining = deadlineDate.getTime() - now.getTime();
  if (msRemaining <= 0) return null;
  const daysRemaining = msRemaining / 86400000;
  const weeksRemaining = daysRemaining / 7;
  const monthsRemaining = daysRemaining / DAYS_PER_MONTH;
  return {
    weekly: weeksRemaining > 0 ? round2(remaining / weeksRemaining) : remaining,
    monthly: monthsRemaining > 0 ? round2(remaining / monthsRemaining) : remaining,
  };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export const BUDGET_CATEGORY_LABEL: Record<BudgetCategoryKey, string> = {
  baseline_survival: "Baseline Survival",
  flexible_needs: "Flexible Needs",
  optional_spending: "Optional Spending",
  savings: "Savings",
  emergency_fund: "Emergency Fund",
  business_building: "Business / Building",
  investing: "Investing",
  debt: "Debt",
  giving: "Giving",
  unallocated: "Unallocated",
};

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeLiquidCash,
  computeMonthlyBaseline,
  computeDailyBaselineBurn,
  computeRunwayDays,
  computeRecentActualDailyBurn,
  computeBurnRates,
  computeScenarioRunway,
  computeZeroBasedRemainder,
  computeRequiredContribution,
  round2,
  DAYS_PER_MONTH,
} from "./finance";
import type { Transaction } from "./supabase/types";

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: crypto.randomUUID(),
    user_id: "u1",
    type: "expense",
    amount: 0,
    category: "flexible_needs",
    occurred_at: new Date().toISOString(),
    merchant: "",
    account_id: null,
    need_or_want: null,
    fixed_or_variable: null,
    is_recurring: false,
    is_baseline_survival: false,
    notes: "",
    receipt_url: null,
    goal_id: null,
    created_at: new Date().toISOString(),
    ...partial,
  };
}

test("computeLiquidCash: income minus expenses, ignores transfers", () => {
  const txs = [
    tx({ type: "income", amount: 3000 }),
    tx({ type: "expense", amount: 1200 }),
    tx({ type: "transfer", amount: 500 }),
    tx({ type: "refund", amount: 50 }),
  ];
  assert.equal(computeLiquidCash(txs), 3000 - 1200 + 50);
});

test("computeLiquidCash: zero transactions yields zero, no crash", () => {
  assert.equal(computeLiquidCash([]), 0);
});

test("computeMonthlyBaseline: only counts recurring + baseline-survival flagged transactions", () => {
  const txs = [
    tx({ amount: 1500, is_baseline_survival: true, is_recurring: true }), // rent
    tx({ amount: 60, is_baseline_survival: true, is_recurring: true }), // phone
    tx({ amount: 200, is_baseline_survival: false, is_recurring: true }), // not baseline
    tx({ amount: 40, is_baseline_survival: true, is_recurring: false }), // one-time, not counted
  ];
  assert.equal(computeMonthlyBaseline(txs), 1560);
});

test("computeDailyBaselineBurn divides by 30.4375", () => {
  assert.equal(computeDailyBaselineBurn(1560), round2(1560 / DAYS_PER_MONTH));
});

test("computeRunwayDays: normal case", () => {
  assert.equal(computeRunwayDays(3000, 50), 60);
});

test("computeRunwayDays: zero daily burn returns null, never Infinity/NaN", () => {
  const result = computeRunwayDays(3000, 0);
  assert.equal(result, null);
  assert.notEqual(result, Infinity);
});

test("computeRunwayDays: negative daily burn returns null (never crashes)", () => {
  assert.equal(computeRunwayDays(3000, -10), null);
});

test("computeRunwayDays: zero or negative liquid cash returns 0 days, not negative/NaN", () => {
  assert.equal(computeRunwayDays(0, 50), 0);
  assert.equal(computeRunwayDays(-100, 50), 0);
});

test("computeRecentActualDailyBurn: averages eligible spending over the lookback window", () => {
  const now = new Date("2026-01-31T12:00:00Z");
  const txs = [
    tx({ type: "expense", amount: 100, occurred_at: "2026-01-25T00:00:00Z" }),
    tx({ type: "expense", amount: 200, occurred_at: "2026-01-28T00:00:00Z" }),
    tx({ type: "income", amount: 5000, occurred_at: "2026-01-28T00:00:00Z" }), // not spending
    tx({ type: "expense", amount: 999, occurred_at: "2025-12-01T00:00:00Z" }), // outside window
  ];
  const result = computeRecentActualDailyBurn(txs, 7, now);
  assert.equal(result, round2(300 / 7));
});

test("computeRecentActualDailyBurn: zero lookback days returns 0, no divide-by-zero", () => {
  assert.equal(computeRecentActualDailyBurn([], 0), 0);
});

test("computeRecentActualDailyBurn: a transaction logged 'today' counts even if its timestamp is later in the day than the current clock time", () => {
  // Regression: transactions default to noon UTC; if "now" is e.g. 09:00 UTC
  // the same day, a naive `occurred_at <= now` comparison would wrongly
  // exclude it as "in the future".
  const now = new Date("2026-08-26T09:00:00Z");
  const txs = [tx({ type: "expense", amount: 150, occurred_at: "2026-08-26T12:00:00Z" })];
  const result = computeRecentActualDailyBurn(txs, 30, now);
  assert.equal(result, round2(150 / 30));
});

test("computeBurnRates: zero spending is handled safely end-to-end", () => {
  const rates = computeBurnRates([tx({ type: "income", amount: 1000 })], 30);
  assert.equal(rates.monthlyBaseline, 0);
  assert.equal(rates.dailyBaselineBurn, 0);
  assert.equal(rates.baselineRunwayDays, null);
  assert.equal(rates.actualRunwayDays, null);
  assert.equal(rates.liquidCash, 1000);
});

test("computeScenarioRunway: reducing spending extends runway", () => {
  const base = computeBurnRates(
    [
      tx({ type: "income", amount: 5000, occurred_at: "2026-01-01T00:00:00Z" }),
      tx({ type: "expense", amount: 100, occurred_at: "2026-01-29T00:00:00Z" }),
      tx({ type: "expense", amount: 100, occurred_at: "2026-01-30T00:00:00Z" }),
    ],
    30,
    new Date("2026-01-31T00:00:00Z")
  );
  const cut = computeScenarioRunway(base, { monthlySpendingDelta: -60 });
  const increase = computeScenarioRunway(base, { monthlySpendingDelta: 60 });
  assert.ok((cut.runwayDays ?? 0) > (base.actualRunwayDays ?? 0));
  assert.ok((increase.runwayDays ?? 0) < (base.actualRunwayDays ?? 0));
});

test("computeScenarioRunway: never overwrites the base rates object", () => {
  const base = computeBurnRates([tx({ type: "income", amount: 1000 })], 30);
  const snapshot = { ...base };
  computeScenarioRunway(base, { monthlySpendingDelta: 500 });
  assert.deepEqual(base, snapshot);
});

test("computeZeroBasedRemainder: fully allocated nets to zero", () => {
  const remainder = computeZeroBasedRemainder(5000, {
    baseline_survival: 2000,
    flexible_needs: 1000,
    optional_spending: 300,
    savings: 1000,
    emergency_fund: 200,
    business_building: 300,
    investing: 100,
    debt: 100,
    giving: 0,
    unallocated: 0,
  });
  assert.equal(remainder, 0);
});

test("computeZeroBasedRemainder: partial allocation leaves a visible remainder (not an error)", () => {
  const remainder = computeZeroBasedRemainder(5000, {
    baseline_survival: 2000,
    flexible_needs: 0,
    optional_spending: 0,
    savings: 0,
    emergency_fund: 0,
    business_building: 0,
    investing: 0,
    debt: 0,
    giving: 0,
    unallocated: 0,
  });
  assert.equal(remainder, 3000);
});

test("computeRequiredContribution: standard case", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const deadline = new Date(now.getTime() + 70 * 86400000); // exactly 10 weeks, UTC-safe
  const result = computeRequiredContribution(1000, 300, deadline.toISOString(), now);
  assert.ok(result);
  assert.equal(result!.weekly, 70);
});

test("computeRequiredContribution: no deadline returns null, not a crash", () => {
  assert.equal(computeRequiredContribution(1000, 0, null), null);
});

test("computeRequiredContribution: past deadline returns null, not a negative/NaN", () => {
  const past = new Date("2000-01-01T00:00:00Z").toISOString();
  assert.equal(computeRequiredContribution(1000, 0, past), null);
});

test("computeRequiredContribution: already met goal returns zero-ish, not negative", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const deadline = new Date(now.getTime() + 30 * 86400000);
  const result = computeRequiredContribution(1000, 1500, deadline.toISOString(), now);
  assert.ok(result);
  assert.equal(result!.weekly, 0);
  assert.equal(result!.monthly, 0);
});

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Edit2, Trash2, Wallet, TrendingDown, TrendingUp, PiggyBank, Target, Sparkles, Package, Heart, ExternalLink } from "lucide-react";
import type {
  Transaction,
  TransactionType,
  TransactionCategory,
  BudgetPeriod,
  BudgetCategoryAllocation,
  BudgetCategoryKey,
  FinancialGoal,
  FinancialGoalKind,
  Order,
  OrderStatus,
  WishlistItem,
  WishlistPriority,
} from "@/lib/supabase/types";
import { MetricCard } from "@/components/MetricCard";
import { SegmentedControl } from "@/components/SegmentedControl";
import { FilterPills } from "@/components/FilterPills";
import { EmptyState } from "@/components/EmptyState";
import { ProgressRing } from "@/components/ProgressRing";
import { FinanceStatCard } from "@/components/FinanceStatCard";
import { Sheet } from "@/components/Sheet";
import { ChatSheet } from "@/components/ChatSheet";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmationDialog";
import {
  computeBurnRates,
  computeScenarioRunway,
  computeZeroBasedRemainder,
  computeCategoryActuals,
  computeRequiredContribution,
  round2,
  BUDGET_CATEGORY_LABEL,
} from "@/lib/finance";

type Tab = "overview" | "transactions" | "budget" | "goals" | "scenarios" | "orders" | "wishlist";

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  ordered: "Ordered",
  shipped: "Shipped",
  delivered: "Delivered",
  returned: "Returned",
  cancelled: "Cancelled",
};
const WISHLIST_PRIORITY_LABEL: Record<WishlistPriority, string> = { low: "Low", medium: "Medium", high: "High" };

const TX_TYPE_LABEL: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
  savings_contribution: "Savings Contribution",
  investment_contribution: "Investment Contribution",
  refund: "Refund",
  recurring_bill: "Recurring Bill",
  debt_payment: "Debt Payment",
};

const BUDGET_CATEGORIES: BudgetCategoryKey[] = [
  "baseline_survival",
  "flexible_needs",
  "optional_spending",
  "savings",
  "emergency_fund",
  "business_building",
  "investing",
  "debt",
  "giving",
  "unallocated",
];

const TX_CATEGORIES: TransactionCategory[] = ["income", ...BUDGET_CATEGORIES];

const GOAL_KIND_LABEL: Record<FinancialGoalKind, string> = {
  emergency_fund: "Emergency Fund",
  business_capital: "Business Capital",
  purchase: "Purchase",
  debt_payoff: "Debt Payoff",
  investing: "Investing",
  travel: "Travel",
  long_term_savings: "Long-term Savings",
};

function currency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

const emptyTxForm = {
  type: "expense" as TransactionType,
  amount: "",
  category: "flexible_needs" as TransactionCategory,
  occurred_at: new Date().toISOString().slice(0, 10),
  merchant: "",
  need_or_want: "" as "" | "need" | "want",
  fixed_or_variable: "" as "" | "fixed" | "variable",
  is_recurring: false,
  is_baseline_survival: false,
  notes: "",
};

const emptyGoalForm = {
  title: "",
  kind: "long_term_savings" as FinancialGoalKind,
  target_amount: "",
  current_amount: "0",
  deadline: "",
};

const emptyOrderForm = {
  item: "",
  merchant: "",
  amount: "",
  status: "ordered" as OrderStatus,
  ordered_at: new Date().toISOString().slice(0, 10),
  tracking_note: "",
};

const emptyWishlistForm = {
  item: "",
  url: "",
  estimated_price: "",
  priority: "medium" as WishlistPriority,
};

interface FinanceClientProps {
  transactions: Transaction[];
  period: BudgetPeriod | null;
  categories: BudgetCategoryAllocation[];
  financialGoals: FinancialGoal[];
  orders: Order[];
  wishlist: WishlistItem[];
}

export function FinanceClient({ transactions, period, categories, financialGoals, orders, wishlist }: FinanceClientProps) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>("overview");

  const [txSheetOpen, setTxSheetOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txForm, setTxForm] = useState(emptyTxForm);
  const [txSearch, setTxSearch] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState<TransactionType | "all">("all");

  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [goalForm, setGoalForm] = useState(emptyGoalForm);

  const [orderSheetOpen, setOrderSheetOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [orderForm, setOrderForm] = useState(emptyOrderForm);

  const [wishlistSheetOpen, setWishlistSheetOpen] = useState(false);
  const [editingWishlistItem, setEditingWishlistItem] = useState<WishlistItem | null>(null);
  const [wishlistForm, setWishlistForm] = useState(emptyWishlistForm);

  const [chatMessage, setChatMessage] = useState<string | undefined>(undefined);
  const [chatOpen, setChatOpen] = useState(false);

  const [scenarioIncome, setScenarioIncome] = useState("0");
  const [scenarioSpending, setScenarioSpending] = useState("0");
  const [scenarioOneTime, setScenarioOneTime] = useState("0");

  const rates = useMemo(() => computeBurnRates(transactions, 30), [transactions]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const monthTx = transactions.filter((t) => {
    const d = new Date(t.occurred_at);
    return d >= monthStart && d <= monthEnd;
  });
  const incomeThisMonth = round2(monthTx.filter((t) => t.type === "income" || t.type === "refund").reduce((s, t) => s + t.amount, 0));
  const spendingThisMonth = round2(
    monthTx.filter((t) => t.type !== "income" && t.type !== "refund" && t.type !== "transfer").reduce((s, t) => s + t.amount, 0)
  );
  const remaining = round2(incomeThisMonth - spendingThisMonth);
  const categoryActuals = computeCategoryActuals(transactions, monthStart, monthEnd);
  const savingsAllocated = categoryActuals["savings"] ?? 0;
  const investmentAllocated = categoryActuals["investing"] ?? 0;
  const debtObligations = categoryActuals["debt"] ?? 0;

  const SPENDING_TYPES: TransactionType[] = ["expense", "debt_payment", "recurring_bill"];
  const last7DaysSpend = Array.from({ length: 7 }).map((_, i) => {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() - (6 - i));
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    return round2(
      transactions
        .filter((t) => SPENDING_TYPES.includes(t.type) && new Date(t.occurred_at) >= dayStart && new Date(t.occurred_at) <= dayEnd)
        .reduce((s, t) => s + t.amount, 0)
    );
  });

  const emergencyGoal = financialGoals.find((g) => g.kind === "emergency_fund");

  const upcomingBills = transactions
    .filter((t) => t.is_recurring && (t.type === "recurring_bill" || t.is_baseline_survival))
    .slice(0, 5);

  const plannedByCategory: Record<BudgetCategoryKey, number> = Object.fromEntries(
    BUDGET_CATEGORIES.map((c) => [c, categories.find((cat) => cat.category === c)?.planned_amount ?? 0])
  ) as Record<BudgetCategoryKey, number>;
  const zeroBasedRemainder = period ? computeZeroBasedRemainder(period.planned_income, plannedByCategory) : 0;

  const filteredTx = transactions.filter((t) => {
    if (txTypeFilter !== "all" && t.type !== txTypeFilter) return false;
    if (txSearch && !t.merchant.toLowerCase().includes(txSearch.toLowerCase()) && !t.notes.toLowerCase().includes(txSearch.toLowerCase())) return false;
    return true;
  });

  // ---------- Transactions ----------
  function openNewTx() {
    setEditingTx(null);
    setTxForm(emptyTxForm);
    setTxSheetOpen(true);
  }
  function openEditTx(t: Transaction) {
    setEditingTx(t);
    setTxForm({
      type: t.type,
      amount: String(t.amount),
      category: t.category,
      occurred_at: t.occurred_at.slice(0, 10),
      merchant: t.merchant,
      need_or_want: t.need_or_want ?? "",
      fixed_or_variable: t.fixed_or_variable ?? "",
      is_recurring: t.is_recurring,
      is_baseline_survival: t.is_baseline_survival,
      notes: t.notes,
    });
    setTxSheetOpen(true);
  }
  async function saveTx(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(txForm.amount);
    if (!amount || amount <= 0) {
      toast("Enter a valid amount.", "error");
      return;
    }
    const supabase = createClient();
    const payload = {
      type: txForm.type,
      amount,
      category: txForm.category,
      occurred_at: new Date(txForm.occurred_at + "T12:00:00").toISOString(),
      merchant: txForm.merchant.trim(),
      need_or_want: txForm.need_or_want || null,
      fixed_or_variable: txForm.fixed_or_variable || null,
      is_recurring: txForm.is_recurring,
      is_baseline_survival: txForm.is_baseline_survival,
      notes: txForm.notes.trim(),
    };
    if (editingTx) {
      const { error } = await supabase.from("transactions").update(payload).eq("id", editingTx.id);
      if (error) return toast("Could not save the transaction.", "error");
      toast("Transaction updated");
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("transactions").insert({ ...payload, user_id: user!.id });
      if (error) return toast("Could not save the transaction.", "error");
      toast("Transaction added");
    }
    setTxSheetOpen(false);
    router.refresh();
  }
  async function deleteTx(t: Transaction) {
    const ok = await confirm({ title: "Delete this transaction?", description: `${t.merchant || TX_TYPE_LABEL[t.type]} — ${currency(t.amount)}`, confirmLabel: "Delete", danger: true });
    if (!ok) return;
    const supabase = createClient();
    const { error } = await supabase.from("transactions").delete().eq("id", t.id);
    if (error) return toast("Could not delete the transaction.", "error");
    toast("Transaction deleted");
    router.refresh();
  }

  function exportCSV() {
    const header = "date,type,category,amount,merchant,need_or_want,fixed_or_variable,recurring,baseline_survival,notes";
    const rows = transactions.map((t) =>
      [t.occurred_at.slice(0, 10), t.type, t.category, t.amount, t.merchant, t.need_or_want ?? "", t.fixed_or_variable ?? "", t.is_recurring, t.is_baseline_survival, t.notes.replace(/,/g, ";")].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `amari-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------- Budget ----------
  async function updatePlannedIncome(value: string) {
    if (!period) return;
    const planned_income = Number(value) || 0;
    const supabase = createClient();
    await supabase.from("budget_periods").update({ planned_income }).eq("id", period.id);
    router.refresh();
  }
  async function updateCategoryPlanned(category: BudgetCategoryKey, value: string) {
    if (!period) return;
    const planned_amount = Number(value) || 0;
    const supabase = createClient();
    const existing = categories.find((c) => c.category === category);
    if (existing) {
      await supabase.from("budget_categories").update({ planned_amount }).eq("id", existing.id);
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("budget_categories").insert({ user_id: user!.id, budget_period_id: period.id, category, planned_amount });
    }
    router.refresh();
  }

  // ---------- Financial Goals ----------
  function openNewGoal() {
    setEditingGoal(null);
    setGoalForm(emptyGoalForm);
    setGoalSheetOpen(true);
  }
  function openEditGoal(g: FinancialGoal) {
    setEditingGoal(g);
    setGoalForm({
      title: g.title,
      kind: g.kind,
      target_amount: String(g.target_amount),
      current_amount: String(g.current_amount),
      deadline: g.deadline ? g.deadline.slice(0, 10) : "",
    });
    setGoalSheetOpen(true);
  }
  async function saveGoal(e: React.FormEvent) {
    e.preventDefault();
    const target = Number(goalForm.target_amount);
    if (!goalForm.title.trim() || !target || target <= 0) {
      toast("Enter a title and a target amount greater than zero.", "error");
      return;
    }
    const supabase = createClient();
    const payload = {
      title: goalForm.title.trim(),
      kind: goalForm.kind,
      target_amount: target,
      current_amount: Number(goalForm.current_amount) || 0,
      deadline: goalForm.deadline || null,
    };
    if (editingGoal) {
      const { error } = await supabase.from("financial_goals").update(payload).eq("id", editingGoal.id);
      if (error) return toast("Could not save the goal.", "error");
      toast("Goal updated");
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("financial_goals").insert({ ...payload, user_id: user!.id });
      if (error) return toast("Could not save the goal.", "error");
      toast("Goal created");
    }
    setGoalSheetOpen(false);
    router.refresh();
  }
  async function deleteGoal(g: FinancialGoal) {
    const ok = await confirm({ title: "Delete this financial goal?", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    const supabase = createClient();
    const { error } = await supabase.from("financial_goals").delete().eq("id", g.id);
    if (error) return toast("Could not delete the goal.", "error");
    toast("Goal deleted");
    router.refresh();
  }

  function askAmariAbout(text: string) {
    setChatMessage(text);
    setChatOpen(true);
  }

  // ---------- Orders ----------
  function openNewOrder() {
    setEditingOrder(null);
    setOrderForm(emptyOrderForm);
    setOrderSheetOpen(true);
  }
  function openEditOrder(o: Order) {
    setEditingOrder(o);
    setOrderForm({
      item: o.item,
      merchant: o.merchant,
      amount: String(o.amount),
      status: o.status,
      ordered_at: o.ordered_at,
      tracking_note: o.tracking_note,
    });
    setOrderSheetOpen(true);
  }
  async function saveOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!orderForm.item.trim()) {
      toast("Enter what you ordered.", "error");
      return;
    }
    const supabase = createClient();
    const payload = {
      item: orderForm.item.trim(),
      merchant: orderForm.merchant.trim(),
      amount: Number(orderForm.amount) || 0,
      status: orderForm.status,
      ordered_at: orderForm.ordered_at,
      tracking_note: orderForm.tracking_note.trim(),
    };
    if (editingOrder) {
      const { error } = await supabase.from("orders").update(payload).eq("id", editingOrder.id);
      if (error) return toast("Could not save the order.", "error");
      toast("Order updated");
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("orders").insert({ ...payload, user_id: user!.id });
      if (error) return toast("Could not save the order.", "error");
      toast("Order added");
    }
    setOrderSheetOpen(false);
    router.refresh();
  }
  async function deleteOrder(o: Order) {
    const ok = await confirm({ title: "Delete this order?", description: o.item, confirmLabel: "Delete", danger: true });
    if (!ok) return;
    const supabase = createClient();
    await supabase.from("orders").delete().eq("id", o.id);
    toast("Order deleted");
    router.refresh();
  }

  // ---------- Wishlist ----------
  function openNewWishlistItem() {
    setEditingWishlistItem(null);
    setWishlistForm(emptyWishlistForm);
    setWishlistSheetOpen(true);
  }
  function openEditWishlistItem(w: WishlistItem) {
    setEditingWishlistItem(w);
    setWishlistForm({
      item: w.item,
      url: w.url,
      estimated_price: w.estimated_price != null ? String(w.estimated_price) : "",
      priority: w.priority,
    });
    setWishlistSheetOpen(true);
  }
  async function saveWishlistItem(e: React.FormEvent) {
    e.preventDefault();
    if (!wishlistForm.item.trim()) {
      toast("Enter an item name.", "error");
      return;
    }
    const supabase = createClient();
    const payload = {
      item: wishlistForm.item.trim(),
      url: wishlistForm.url.trim(),
      estimated_price: wishlistForm.estimated_price ? Number(wishlistForm.estimated_price) : null,
      priority: wishlistForm.priority,
    };
    if (editingWishlistItem) {
      const { error } = await supabase.from("wishlist_items").update(payload).eq("id", editingWishlistItem.id);
      if (error) return toast("Could not save the item.", "error");
      toast("Wishlist item updated");
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("wishlist_items").insert({ ...payload, user_id: user!.id });
      if (error) return toast("Could not save the item.", "error");
      toast("Added to wishlist");
    }
    setWishlistSheetOpen(false);
    router.refresh();
  }
  async function toggleWishlistPurchased(w: WishlistItem) {
    const supabase = createClient();
    await supabase.from("wishlist_items").update({ purchased: !w.purchased }).eq("id", w.id);
    router.refresh();
  }
  async function deleteWishlistItem(w: WishlistItem) {
    const ok = await confirm({ title: "Remove from wishlist?", description: w.item, confirmLabel: "Remove", danger: true });
    if (!ok) return;
    const supabase = createClient();
    await supabase.from("wishlist_items").delete().eq("id", w.id);
    toast("Removed from wishlist");
    router.refresh();
  }

  // ---------- Scenario ----------
  const scenario = computeScenarioRunway(rates, {
    incomeDelta: Number(scenarioIncome) || 0,
    monthlySpendingDelta: Number(scenarioSpending) || 0,
    oneTimeExpense: Number(scenarioOneTime) || 0,
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Finance</h1>
          <p className="text-sm text-text-secondary">Manual budgeting, cash flow, and runway — tracking and planning only.</p>
        </div>
        <button onClick={openNewTx} className="flex min-h-11 items-center gap-1.5 rounded-xl bg-blue px-4 text-sm font-semibold text-white transition-colors hover:bg-blue/90">
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Add Transaction
        </button>
      </div>

      <div className="overflow-x-auto">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: "overview", label: "Overview" },
            { value: "transactions", label: "Transactions" },
            { value: "budget", label: "Budget" },
            { value: "goals", label: "Goals" },
            { value: "scenarios", label: "Scenarios" },
            { value: "orders", label: "Orders" },
            { value: "wishlist", label: "Wishlist" },
          ]}
        />
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard icon={Wallet} label="Liquid cash" value={rates.liquidCash} format={currency} />
            <MetricCard icon={TrendingUp} label="Income this month" value={incomeThisMonth} format={currency} />
            <MetricCard icon={TrendingDown} label="Spending this month" value={spendingThisMonth} format={currency} />
            <MetricCard icon={PiggyBank} label="Remaining" value={remaining} format={currency} />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard icon={Wallet} label="Baseline survival" value={rates.monthlyBaseline} format={currency} />
            <MetricCard icon={Wallet} label="Savings allocated" value={savingsAllocated} format={currency} />
            <MetricCard icon={Wallet} label="Investing" value={investmentAllocated} format={currency} />
            <MetricCard icon={Wallet} label="Debt obligations" value={debtObligations} format={currency} />
          </div>

          <FinanceStatCard
            label="Recent daily spend"
            value={currency(rates.recentActualDailyBurn)}
            subLabel="Average over last 7 days · vs. baseline burn"
            trendPct={rates.dailyBaselineBurn > 0 ? `${Math.round((Math.abs(rates.recentActualDailyBurn - rates.dailyBaselineBurn) / rates.dailyBaselineBurn) * 100)}%` : undefined}
            trendDirection={rates.recentActualDailyBurn <= rates.dailyBaselineBurn ? "up" : "down"}
            bars={last7DaysSpend}
          />

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text">Runway</h2>
              <button onClick={() => askAmariAbout("Explain my current runway calculation and what's driving it.")} className="flex items-center gap-1.5 text-xs font-semibold text-blue-light">
                <Sparkles className="h-3.5 w-3.5" /> Ask Amari
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Baseline runway</p>
                <p className="mt-1 text-2xl font-semibold text-text">{rates.baselineRunwayDays === null ? "—" : `${rates.baselineRunwayDays} days`}</p>
                <p className="text-xs text-text-secondary">{rates.baselineRunwayDate ? `Until ${rates.baselineRunwayDate.toLocaleDateString()}` : "No recurring baseline costs logged yet"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Actual runway (last 30d burn)</p>
                <p className="mt-1 text-2xl font-semibold text-text">{rates.actualRunwayDays === null ? "—" : `${rates.actualRunwayDays} days`}</p>
                <p className="text-xs text-text-secondary">{rates.actualRunwayDate ? `Until ${rates.actualRunwayDate.toLocaleDateString()}` : "No spending logged in the last 30 days"}</p>
              </div>
            </div>
            <p className="mt-4 rounded-xl bg-card-secondary p-3 text-xs leading-relaxed text-text-secondary">
              Assumptions: liquid cash = all-time income/refunds minus expenses, savings, investing, debt payments, and bills (transfers excluded).
              Daily baseline burn = monthly baseline ÷ 30.4375. Actual daily burn = spending in the last 30 days ÷ 30. This is a planning estimate, not a guarantee.
            </p>
          </div>

          {emergencyGoal && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold text-text">Emergency fund progress</h2>
              <div className="flex items-center gap-4">
                <ProgressRing value={(emergencyGoal.current_amount / emergencyGoal.target_amount) * 100} size={64} stroke={6}>
                  <span className="text-xs font-semibold text-text">{Math.round((emergencyGoal.current_amount / emergencyGoal.target_amount) * 100)}%</span>
                </ProgressRing>
                <div>
                  <p className="text-sm font-medium text-text">{currency(emergencyGoal.current_amount)} of {currency(emergencyGoal.target_amount)}</p>
                  <p className="text-xs text-text-secondary">{emergencyGoal.deadline ? `Target: ${new Date(emergencyGoal.deadline).toLocaleDateString()}` : "No deadline set"}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-3 text-sm font-semibold text-text">Upcoming / recurring bills</h2>
            {upcomingBills.length ? (
              <div className="flex flex-col gap-2">
                {upcomingBills.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-text">{b.merchant || TX_TYPE_LABEL[b.type]}</p>
                      <p className="text-xs text-text-secondary">{BUDGET_CATEGORY_LABEL[b.category as BudgetCategoryKey] ?? b.category}</p>
                    </div>
                    <span className="font-mono text-sm text-text">{currency(b.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Wallet} title="No recurring bills logged" description="Mark a transaction as recurring to track it here." />
            )}
          </div>
        </div>
      )}

      {tab === "transactions" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                id="tx-search"
                name="search"
                type="search"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="Search merchant or notes…"
                className="min-h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm text-text outline-none focus:border-blue"
              />
            </div>
            <button onClick={exportCSV} className="min-h-10 rounded-xl border border-border px-3 text-sm font-medium text-text-secondary hover:text-text">
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto pb-1">
            <FilterPills
              value={txTypeFilter}
              onChange={setTxTypeFilter}
              options={[{ value: "all", label: "All" }, ...Object.entries(TX_TYPE_LABEL).map(([value, label]) => ({ value: value as TransactionType, label }))]}
            />
          </div>

          {filteredTx.length ? (
            <div className="flex flex-col gap-2">
              {filteredTx.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">{t.merchant || TX_TYPE_LABEL[t.type]}</p>
                    <p className="text-xs text-text-secondary">
                      {new Date(t.occurred_at).toLocaleDateString()} · {BUDGET_CATEGORY_LABEL[t.category as BudgetCategoryKey] ?? "Income"}
                      {t.is_recurring ? " · Recurring" : ""}
                    </p>
                  </div>
                  <span className={`font-mono text-sm font-semibold ${t.type === "income" || t.type === "refund" ? "text-success" : "text-text"}`}>
                    {t.type === "income" || t.type === "refund" ? "+" : "−"}
                    {currency(t.amount)}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => openEditTx(t)} className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-card-secondary hover:text-text">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteTx(t)} className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-error/10 hover:text-error">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Wallet} title="No transactions yet" description="Add your first income or expense to get started." />
          )}
        </div>
      )}

      {tab === "budget" && period && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Planned income this month</label>
            <input
              type="number"
              defaultValue={period.planned_income}
              onBlur={(e) => updatePlannedIncome(e.target.value)}
              className="min-h-11 w-full max-w-xs rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
            />
            <p className={`mt-3 text-sm font-semibold ${zeroBasedRemainder === 0 ? "text-success" : zeroBasedRemainder > 0 ? "text-blue-light" : "text-error"}`}>
              {zeroBasedRemainder === 0
                ? "Fully allocated — zero-based."
                : zeroBasedRemainder > 0
                ? `${currency(zeroBasedRemainder)} not yet allocated to a category.`
                : `Over-allocated by ${currency(Math.abs(zeroBasedRemainder))}.`}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {BUDGET_CATEGORIES.map((cat) => {
              const planned = plannedByCategory[cat];
              const actual = categoryActuals[cat] ?? 0;
              const pct = planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : 0;
              return (
                <div key={cat} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-text">{BUDGET_CATEGORY_LABEL[cat]}</span>
                    <input
                      type="number"
                      defaultValue={planned}
                      onBlur={(e) => updateCategoryPlanned(cat, e.target.value)}
                      className="min-h-9 w-28 rounded-lg border border-border bg-bg px-2.5 text-right text-sm text-text outline-none focus:border-blue"
                    />
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-card-secondary">
                    <div className={`h-full rounded-full ${pct >= 100 ? "bg-error" : "bg-blue"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    {currency(actual)} actual of {currency(planned)} planned ({pct}%)
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "goals" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openNewGoal} className="flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3.5 text-sm font-semibold text-text hover:bg-card">
              <Plus className="h-4 w-4" /> New Financial Goal
            </button>
          </div>
          {financialGoals.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {financialGoals.map((g) => {
                const pct = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100));
                const contribution = computeRequiredContribution(g.target_amount, g.current_amount, g.deadline);
                return (
                  <div key={g.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start gap-3">
                      <ProgressRing value={pct} size={48} stroke={4}>
                        <span className="text-[11px] font-semibold text-text">{pct}%</span>
                      </ProgressRing>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text">{g.title}</p>
                        <p className="text-xs text-text-secondary">{GOAL_KIND_LABEL[g.kind]}</p>
                        <p className="mt-1 text-xs text-text">
                          {currency(g.current_amount)} / {currency(g.target_amount)}
                        </p>
                        {contribution && (
                          <p className="mt-1 text-xs text-blue-light">
                            Need {currency(contribution.weekly)}/wk or {currency(contribution.monthly)}/mo
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => openEditGoal(g)} className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-card-secondary hover:text-text">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteGoal(g)} className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-error/10 hover:text-error">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={Target} title="No financial goals yet" description="Add an emergency fund, purchase, or savings target." />
          )}
        </div>
      )}

      {tab === "scenarios" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Monthly income change</label>
              <input type="number" value={scenarioIncome} onChange={(e) => setScenarioIncome(e.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Monthly spending change (+ more, − less)</label>
              <input type="number" value={scenarioSpending} onChange={(e) => setScenarioSpending(e.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">One-time expense</label>
              <input type="number" value={scenarioOneTime} onChange={(e) => setScenarioOneTime(e.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue" />
            </div>
          </div>

          <div className="rounded-2xl border border-blue/25 bg-blue/5 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-light">Scenario result</p>
            <p className="mt-1 text-2xl font-semibold text-text">{scenario.runwayDays === null ? "—" : `${scenario.runwayDays} days`}</p>
            <p className="text-xs text-text-secondary">
              {scenario.runwayDate ? `Estimated until ${scenario.runwayDate.toLocaleDateString()}` : "No burn to project"} · currently {rates.actualRunwayDays ?? "—"} days
            </p>
            <p className="mt-3 text-xs text-text-secondary">This is a projection only — nothing here changes your real budget or transactions.</p>
            <button onClick={() => askAmariAbout(`Run this scenario for me: monthly income change ${scenarioIncome}, monthly spending change ${scenarioSpending}, one-time expense ${scenarioOneTime}. Explain the impact on my runway.`)} className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-blue-light">
              <Sparkles className="h-3.5 w-3.5" /> Ask Amari to explain this
            </button>
          </div>
        </div>
      )}

      {tab === "orders" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={openNewOrder} className="flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3.5 text-sm font-semibold text-text hover:bg-card">
              <Plus className="h-4 w-4" /> Add Order
            </button>
          </div>
          {orders.length === 0 ? (
            <EmptyState icon={Package} title="No orders tracked" description="Log anything you've bought to keep tabs on where it's at." />
          ) : (
            orders.map((o) => (
              <div key={o.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">{o.item}</p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {o.merchant && `${o.merchant} · `}
                      {currency(o.amount)} · {new Date(o.ordered_at).toLocaleDateString()}
                    </p>
                    <span className="mt-2 inline-block rounded-full border border-border-strong px-2 py-0.5 text-[10px] uppercase tracking-wide text-blue-light">
                      {ORDER_STATUS_LABEL[o.status]}
                    </span>
                    {o.tracking_note && <p className="mt-1.5 text-xs text-text-secondary">{o.tracking_note}</p>}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-0.5">
                    <button onClick={() => openEditOrder(o)} className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-card-secondary hover:text-text">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteOrder(o)} className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-error/10 hover:text-error">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "wishlist" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={openNewWishlistItem} className="flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3.5 text-sm font-semibold text-text hover:bg-card">
              <Plus className="h-4 w-4" /> Add to Wishlist
            </button>
          </div>
          {wishlist.length === 0 ? (
            <EmptyState icon={Heart} title="Wishlist is empty" description="Save anything you're thinking about buying." />
          ) : (
            wishlist.map((w) => (
              <div key={w.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                <button
                  onClick={() => toggleWishlistPurchased(w)}
                  aria-label={w.purchased ? "Mark as not purchased" : "Mark as purchased"}
                  className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    w.purchased ? "border-success bg-success text-bg" : "border-border-strong text-transparent"
                  }`}
                >
                  ✓
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${w.purchased ? "text-text-secondary line-through" : "text-text"}`}>{w.item}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {w.estimated_price != null && currency(w.estimated_price)}
                    {w.estimated_price != null && " · "}
                    {WISHLIST_PRIORITY_LABEL[w.priority]} priority
                  </p>
                  {w.url && (
                    <a href={w.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-blue-light hover:underline">
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-0.5">
                  <button onClick={() => openEditWishlistItem(w)} className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-card-secondary hover:text-text">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deleteWishlistItem(w)} className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-error/10 hover:text-error">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Transaction sheet */}
      <Sheet open={txSheetOpen} onClose={() => setTxSheetOpen(false)} title={editingTx ? "Edit Transaction" : "Add Transaction"}>
        <form onSubmit={saveTx} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Type</label>
              <select value={txForm.type} onChange={(e) => setTxForm((f) => ({ ...f, type: e.target.value as TransactionType }))} className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue">
                {Object.entries(TX_TYPE_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Amount</label>
              <input required type="number" step="0.01" min="0.01" value={txForm.amount} onChange={(e) => setTxForm((f) => ({ ...f, amount: e.target.value }))} className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Merchant / source</label>
            <input id="tx-merchant" name="merchant" type="text" value={txForm.merchant} onChange={(e) => setTxForm((f) => ({ ...f, merchant: e.target.value }))} className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Category</label>
              <select value={txForm.category} onChange={(e) => setTxForm((f) => ({ ...f, category: e.target.value as TransactionCategory }))} className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue">
                {TX_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c === "income" ? "Income" : BUDGET_CATEGORY_LABEL[c as BudgetCategoryKey]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Date</label>
              <input type="date" value={txForm.occurred_at} onChange={(e) => setTxForm((f) => ({ ...f, occurred_at: e.target.value }))} className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Need / Want</label>
              <select value={txForm.need_or_want} onChange={(e) => setTxForm((f) => ({ ...f, need_or_want: e.target.value as "" | "need" | "want" }))} className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue">
                <option value="">—</option>
                <option value="need">Need</option>
                <option value="want">Want</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Fixed / Variable</label>
              <select value={txForm.fixed_or_variable} onChange={(e) => setTxForm((f) => ({ ...f, fixed_or_variable: e.target.value as "" | "fixed" | "variable" }))} className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue">
                <option value="">—</option>
                <option value="fixed">Fixed</option>
                <option value="variable">Variable</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" checked={txForm.is_recurring} onChange={(e) => setTxForm((f) => ({ ...f, is_recurring: e.target.checked }))} />
              Recurring
            </label>
            <label className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" checked={txForm.is_baseline_survival} onChange={(e) => setTxForm((f) => ({ ...f, is_baseline_survival: e.target.checked }))} />
              Baseline survival cost
            </label>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Notes</label>
            <textarea value={txForm.notes} onChange={(e) => setTxForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue" />
          </div>
          <button type="submit" className="min-h-11 w-full rounded-xl bg-blue text-sm font-semibold text-white transition-colors hover:bg-blue/90">
            {editingTx ? "Save changes" : "Add transaction"}
          </button>
        </form>
      </Sheet>

      {/* Financial goal sheet */}
      <Sheet open={goalSheetOpen} onClose={() => setGoalSheetOpen(false)} title={editingGoal ? "Edit Financial Goal" : "New Financial Goal"}>
        <form onSubmit={saveGoal} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Title</label>
            <input id="goal-title" name="title" type="text" required value={goalForm.title} onChange={(e) => setGoalForm((f) => ({ ...f, title: e.target.value }))} className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Kind</label>
            <select value={goalForm.kind} onChange={(e) => setGoalForm((f) => ({ ...f, kind: e.target.value as FinancialGoalKind }))} className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue">
              {Object.entries(GOAL_KIND_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Target amount</label>
              <input required type="number" step="0.01" min="0.01" value={goalForm.target_amount} onChange={(e) => setGoalForm((f) => ({ ...f, target_amount: e.target.value }))} className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Current amount</label>
              <input type="number" step="0.01" min="0" value={goalForm.current_amount} onChange={(e) => setGoalForm((f) => ({ ...f, current_amount: e.target.value }))} className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Deadline (optional)</label>
            <input type="date" value={goalForm.deadline} onChange={(e) => setGoalForm((f) => ({ ...f, deadline: e.target.value }))} className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue" />
          </div>
          <button type="submit" className="min-h-11 w-full rounded-xl bg-blue text-sm font-semibold text-white transition-colors hover:bg-blue/90">
            {editingGoal ? "Save changes" : "Create goal"}
          </button>
        </form>
      </Sheet>

      {/* Order sheet */}
      <Sheet open={orderSheetOpen} onClose={() => setOrderSheetOpen(false)} title={editingOrder ? "Edit Order" : "Add Order"}>
        <form onSubmit={saveOrder} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Item</label>
            <input
              type="text"
              required
              value={orderForm.item}
              onChange={(e) => setOrderForm((f) => ({ ...f, item: e.target.value }))}
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Merchant</label>
              <input
                type="text"
                value={orderForm.merchant}
                onChange={(e) => setOrderForm((f) => ({ ...f, merchant: e.target.value }))}
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={orderForm.amount}
                onChange={(e) => setOrderForm((f) => ({ ...f, amount: e.target.value }))}
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Status</label>
              <select
                value={orderForm.status}
                onChange={(e) => setOrderForm((f) => ({ ...f, status: e.target.value as OrderStatus }))}
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              >
                {Object.entries(ORDER_STATUS_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Ordered on</label>
              <input
                type="date"
                value={orderForm.ordered_at}
                onChange={(e) => setOrderForm((f) => ({ ...f, ordered_at: e.target.value }))}
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Tracking / notes</label>
            <textarea
              value={orderForm.tracking_note}
              onChange={(e) => setOrderForm((f) => ({ ...f, tracking_note: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <button type="submit" className="min-h-11 w-full rounded-xl bg-blue text-sm font-semibold text-white transition-colors hover:bg-blue/90">
            {editingOrder ? "Save changes" : "Add order"}
          </button>
        </form>
      </Sheet>

      {/* Wishlist sheet */}
      <Sheet open={wishlistSheetOpen} onClose={() => setWishlistSheetOpen(false)} title={editingWishlistItem ? "Edit Wishlist Item" : "Add to Wishlist"}>
        <form onSubmit={saveWishlistItem} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Item</label>
            <input
              type="text"
              required
              value={wishlistForm.item}
              onChange={(e) => setWishlistForm((f) => ({ ...f, item: e.target.value }))}
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Link (optional)</label>
            <input
              type="url"
              value={wishlistForm.url}
              onChange={(e) => setWishlistForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://…"
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Estimated price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={wishlistForm.estimated_price}
                onChange={(e) => setWishlistForm((f) => ({ ...f, estimated_price: e.target.value }))}
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Priority</label>
              <select
                value={wishlistForm.priority}
                onChange={(e) => setWishlistForm((f) => ({ ...f, priority: e.target.value as WishlistPriority }))}
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              >
                {Object.entries(WISHLIST_PRIORITY_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="min-h-11 w-full rounded-xl bg-blue text-sm font-semibold text-white transition-colors hover:bg-blue/90">
            {editingWishlistItem ? "Save changes" : "Add to wishlist"}
          </button>
        </form>
      </Sheet>

      <ChatSheet open={chatOpen} onClose={() => setChatOpen(false)} initialMessage={chatMessage} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ListChecks, TrendingDown, TrendingUp } from "lucide-react";
import { Sheet } from "@/components/Sheet";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { todayISO } from "@/lib/utils";

type QuickKind = "task" | "expense" | "income";

const KINDS: { value: QuickKind; label: string; icon: typeof ListChecks }[] = [
  { value: "task", label: "Task", icon: ListChecks },
  { value: "expense", label: "Expense", icon: TrendingDown },
  { value: "income", label: "Income", icon: TrendingUp },
];

export function QuickAdd() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<QuickKind>("task");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitle("");
    setAmount("");
    setKind("task");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (kind === "task") {
      if (!title.trim()) { setSaving(false); return; }
      const { error } = await supabase.from("tasks").insert({ user_id: user!.id, title: title.trim(), task_date: todayISO() });
      if (error) toast("Could not add the task.", "error");
      else toast("Task added");
    } else {
      const value = Number(amount);
      if (!value || value <= 0) { setSaving(false); toast("Enter a valid amount.", "error"); return; }
      const { error } = await supabase.from("transactions").insert({
        user_id: user!.id,
        type: kind === "income" ? "income" : "expense",
        amount: value,
        category: kind === "income" ? "income" : "flexible_needs",
        merchant: title.trim(),
        occurred_at: new Date().toISOString(),
      });
      if (error) toast("Could not add the transaction.", "error");
      else toast(kind === "income" ? "Income added" : "Expense added");
    }

    setSaving(false);
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Quick add"
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-blue text-white shadow-lg shadow-blue/20 transition-colors hover:bg-blue/90"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Quick Add">
        <div className="mb-4 flex gap-2">
          {KINDS.map((k) => {
            const Icon = k.icon;
            return (
              <button
                key={k.value}
                type="button"
                onClick={() => setKind(k.value)}
                className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-semibold transition-colors ${
                  kind === k.value ? "border-blue bg-blue/10 text-blue-light" : "border-border text-text-secondary"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                {k.label}
              </button>
            );
          })}
        </div>
        <form onSubmit={submit} className="space-y-3">
          {kind !== "task" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">Amount</label>
              <input
                autoFocus
                required
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-border bg-bg px-4 text-lg text-text outline-none focus:border-blue"
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-secondary">
              {kind === "task" ? "What needs doing?" : "Merchant / source (optional)"}
            </label>
            <input
              id="quick-add-title"
              name="title"
              type="text"
              autoFocus={kind === "task"}
              required={kind === "task"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-border bg-bg px-4 text-[15px] text-text outline-none focus:border-blue"
            />
          </div>
          <button type="submit" disabled={saving} className="min-h-11 w-full rounded-xl bg-blue text-sm font-semibold text-white transition-colors hover:bg-blue/90 disabled:opacity-50">
            {saving ? "Adding…" : "Add"}
          </button>
        </form>
      </Sheet>
    </>
  );
}

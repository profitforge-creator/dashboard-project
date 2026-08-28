"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Footprints, Moon, Pill, Link2, RefreshCw, Copy, Check, Droplets, Minus, Sunrise, Sun, Sunset, Clock } from "lucide-react";
import type { HealthLog, Supplement, SupplementLog, SupplementTimeSlot } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { PerformanceChart } from "@/components/PerformanceChart";
import { BarChart } from "@/components/BarChart";
import { MetricCard } from "@/components/MetricCard";
import { EmptyState } from "@/components/EmptyState";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/Button";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmationDialog";
import { SUPABASE_URL } from "@/lib/supabase/config";

interface HealthClientProps {
  logs: HealthLog[];
  supplements: Supplement[];
  supplementLogs: SupplementLog[];
  syncToken: { user_id: string; token: string; created_at: string } | null;
  today: string;
}

type Period = "week" | "month";
const PERIOD_DAYS: Record<Period, number> = { week: 7, month: 30 };

function lastNDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}
const WEEKDAY_NARROW = ["S", "M", "T", "W", "T", "F", "S"];
function dayLabel(iso: string) {
  return WEEKDAY_NARROW[new Date(iso + "T12:00:00").getDay()];
}

const SLOT_META: Record<SupplementTimeSlot, { label: string; window: string; icon: typeof Sunrise }> = {
  morning: { label: "Morning", window: "7-10 AM", icon: Sunrise },
  midday: { label: "Midday", window: "12-2 PM", icon: Sun },
  evening: { label: "Evening", window: "4-9 PM", icon: Sunset },
  before_bed: { label: "Before bed", window: "10 PM", icon: Moon },
  anytime: { label: "Anytime", window: "No fixed window", icon: Clock },
};
const SLOT_ORDER: SupplementTimeSlot[] = ["morning", "midday", "evening", "before_bed", "anytime"];

export function HealthClient({ logs, supplements, supplementLogs, syncToken, today }: HealthClientProps) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [period, setPeriod] = useState<Period>("week");
  const [logSheetOpen, setLogSheetOpen] = useState(false);
  const [supSheetOpen, setSupSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const todayLog = logs.find((l) => l.log_date === today) ?? null;
  const [stepsForm, setStepsForm] = useState(todayLog?.steps?.toString() ?? "");
  const [sleepForm, setSleepForm] = useState(todayLog?.sleep_hours?.toString() ?? "");
  const [qualityForm, setQualityForm] = useState(todayLog?.sleep_quality ?? 3);

  const [supForm, setSupForm] = useState<{ name: string; dosage: string; schedule_note: string; time_slot: SupplementTimeSlot }>({
    name: "",
    dosage: "",
    schedule_note: "",
    time_slot: "anytime",
  });

  const WATER_TARGET_BOTTLES = 8;
  const WATER_BOTTLE_LITERS = 0.5;
  const waterToday = todayLog?.water_bottles ?? 0;

  // `days` depends on "now" and weekday labels are locale-derived — computing it during the
  // server render and re-computing during client hydration can diverge (server clock/locale vs
  // browser clock/locale), which breaks React hydration. So it's computed client-only, after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const days = useMemo(() => (mounted ? lastNDays(PERIOD_DAYS[period]) : []), [period, mounted]);
  const logByDate = useMemo(() => new Map(logs.map((l) => [l.log_date, l])), [logs]);

  const sleepData = days.map((d) => ({ label: dayLabel(d), value: logByDate.get(d)?.sleep_hours ?? 0 }));
  const stepsData = days.map((d) => ({ label: dayLabel(d), value: logByDate.get(d)?.steps ?? 0 }));

  const loggedSleep = days.map((d) => logByDate.get(d)?.sleep_hours).filter((v): v is number => v != null);
  const avgSleep = loggedSleep.length ? loggedSleep.reduce((s, v) => s + v, 0) / loggedSleep.length : 0;
  const firstHalf = loggedSleep.slice(0, Math.floor(loggedSleep.length / 2));
  const secondHalf = loggedSleep.slice(Math.floor(loggedSleep.length / 2));
  const firstAvg = firstHalf.length ? firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length : 0;
  const secondAvg = secondHalf.length ? secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length : 0;
  const trendUp = secondAvg >= firstAvg;
  const trendPct = firstAvg > 0 ? Math.round((Math.abs(secondAvg - firstAvg) / firstAvg) * 100) : 0;

  const totalSteps = days.reduce((s, d) => s + (logByDate.get(d)?.steps ?? 0), 0);
  const avgSteps = days.length ? Math.round(totalSteps / days.length) : 0;
  const loggedDays = days.filter((d) => logByDate.has(d)).length;
  const consistencyPct = days.length ? Math.round((loggedDays / days.length) * 100) : 0;

  const takenTodayIds = new Set(supplementLogs.filter((l) => l.log_date === today && l.taken).map((l) => l.supplement_id));

  async function saveTodayLog(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("health_logs").upsert(
      {
        user_id: user.id,
        log_date: today,
        steps: stepsForm ? Number(stepsForm) : null,
        sleep_hours: sleepForm ? Number(sleepForm) : null,
        sleep_quality: qualityForm,
        source: "manual",
      },
      { onConflict: "user_id,log_date" }
    );
    if (error) {
      toast("Couldn't save today's log.", "error");
      return;
    }
    toast("Today's health log saved.", "success");
    setLogSheetOpen(false);
    router.refresh();
  }

  async function logWater(delta: number) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const next = Math.max(0, waterToday + delta);
    const { error } = await supabase.from("health_logs").upsert(
      { user_id: user.id, log_date: today, water_bottles: next, source: todayLog?.source ?? "manual" },
      { onConflict: "user_id,log_date" }
    );
    if (error) {
      toast("Couldn't log water.", "error");
      return;
    }
    router.refresh();
  }

  async function toggleSupplement(supplementId: string, taken: boolean) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("supplement_logs").upsert(
      { user_id: user.id, supplement_id: supplementId, log_date: today, taken: !taken },
      { onConflict: "user_id,supplement_id,log_date" }
    );
    router.refresh();
  }

  async function addSupplement(e: React.FormEvent) {
    e.preventDefault();
    if (!supForm.name.trim()) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("supplements").insert({
      user_id: user.id,
      name: supForm.name.trim(),
      dosage: supForm.dosage.trim(),
      schedule_note: supForm.schedule_note.trim(),
      time_slot: supForm.time_slot,
    });
    if (error) {
      toast("Couldn't add supplement.", "error");
      return;
    }
    toast("Supplement added.", "success");
    setSupForm({ name: "", dosage: "", schedule_note: "", time_slot: "anytime" });
    setSupSheetOpen(false);
    router.refresh();
  }

  async function deleteSupplement(id: string) {
    const ok = await confirm({ title: "Remove supplement?", description: "This stops tracking it going forward.", confirmLabel: "Remove", danger: true });
    if (!ok) return;
    const supabase = createClient();
    await supabase.from("supplements").delete().eq("id", id);
    toast("Supplement removed.", "success");
    router.refresh();
  }

  async function generateSyncToken() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    if (syncToken) await supabase.from("health_sync_tokens").delete().eq("user_id", user.id);
    const token = (crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")).slice(0, 48);
    const { error } = await supabase.from("health_sync_tokens").insert({ user_id: user.id, token });
    if (error) {
      toast("Couldn't generate a sync token.", "error");
      return;
    }
    toast(syncToken ? "Sync token regenerated — update your Shortcut." : "Sync token generated.", "success");
    router.refresh();
  }

  const syncUrl = `${SUPABASE_URL}/rest/v1/rpc/sync_health_log`;

  function copySyncUrl() {
    navigator.clipboard.writeText(syncUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Health</h1>
          <p className="text-sm text-text-secondary">Steps, sleep, and supplements — synced from Apple Health via Shortcuts, or logged manually.</p>
        </div>
        <Button onClick={() => setLogSheetOpen(true)}>
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Log today
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard icon={Moon} label="Avg sleep" value={Math.round(avgSleep * 10)} format={(v) => `${(v / 10).toFixed(1)}h`} />
        <MetricCard icon={Footprints} label="Avg steps" value={avgSteps} format={(v) => v.toLocaleString()} />
        <MetricCard icon={Check} label="Log consistency" value={consistencyPct} format={(v) => `${v}%`} />
        <MetricCard icon={Pill} label="Active supplements" value={supplements.filter((s) => s.active).length} format={(v) => `${v}`} />
      </div>

      <PerformanceChart
        title="Sleep consistency"
        subtitleLines={["Hours per night"]}
        data={sleepData}
        period={period}
        onPeriodChange={setPeriod}
        periods={[
          { value: "week", label: "Week" },
          { value: "month", label: "Month" },
        ]}
        statLabel="Average sleep"
        statValue={`${avgSleep.toFixed(1)}h`}
        trendPct={loggedSleep.length >= 2 ? `${trendPct}%` : undefined}
        trendDirection={trendUp ? "up" : "down"}
      />

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-1 text-sm font-medium text-text">Steps · last {days.length}d</p>
        <p className="mb-3 text-xs text-text-secondary">Daily step count</p>
        <BarChart data={stepsData} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="label-mono flex items-center gap-1.5 text-text-secondary">
            <Droplets className="h-3.5 w-3.5" strokeWidth={2} /> Water
          </span>
        </div>
        <p className="text-3xl font-semibold tabular-nums text-text">
          {waterToday} <span className="text-base font-normal text-text-secondary">/ {WATER_TARGET_BOTTLES} bottles</span>
        </p>
        <button
          onClick={() => logWater(1)}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue text-sm font-semibold text-bg transition-colors hover:bg-blue/90"
        >
          <Droplets className="h-4 w-4" strokeWidth={2} /> Drank a bottle
        </button>
        {waterToday > 0 && (
          <button onClick={() => logWater(-1)} className="mt-2 flex min-h-9 w-full items-center justify-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text">
            <Minus className="h-3 w-3" strokeWidth={2} /> Undo one
          </button>
        )}
        <div className="mt-3 flex items-center justify-between text-xs text-text-secondary">
          <span>{(WATER_TARGET_BOTTLES * WATER_BOTTLE_LITERS).toFixed(1)}L target</span>
          <span>{Math.max(0, WATER_TARGET_BOTTLES - waterToday)} bottles to go</span>
        </div>
        <div className="mt-2 flex gap-1">
          {Array.from({ length: WATER_TARGET_BOTTLES }).map((_, i) => (
            <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < waterToday ? "bg-blue" : "bg-card-secondary")} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <span className="label-mono flex items-center gap-1.5 text-text-secondary">
            <Pill className="h-3.5 w-3.5" strokeWidth={2} /> Daily stack
          </span>
          <span className="label-mono text-text-secondary">
            {takenTodayIds.size}/{supplements.filter((s) => s.active).length} taken
          </span>
        </div>

        {supplements.filter((s) => s.active).length === 0 ? (
          <EmptyState icon={Pill} title="No supplements tracked" description="Add one to check it off daily." />
        ) : (
          <div className="space-y-4">
            {SLOT_ORDER.map((slot) => {
              const slotSupplements = supplements.filter((s) => s.active && s.time_slot === slot);
              const meta = SLOT_META[slot];
              const SlotIcon = meta.icon;
              return (
                <div key={slot}>
                  <p className="label-mono mb-2 flex items-center gap-1.5 text-text-secondary">
                    <SlotIcon className="h-3 w-3" strokeWidth={2} /> {meta.label} · {meta.window}
                  </p>
                  {slotSupplements.length === 0 ? (
                    <p className="pl-4 text-xs italic text-text-secondary/60">Nothing yet</p>
                  ) : (
                    <div className="space-y-2">
                      {slotSupplements.map((s) => {
                        const taken = takenTodayIds.has(s.id);
                        return (
                          <div key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5">
                            <button onClick={() => toggleSupplement(s.id, taken)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                              <span
                                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                  taken ? "border-success bg-success text-bg" : "border-border-strong text-transparent"
                                }`}
                              >
                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                              </span>
                              <span className="min-w-0">
                                <p className={`truncate text-sm font-medium ${taken ? "text-text-secondary line-through" : "text-text"}`}>{s.name}</p>
                                {(s.dosage || s.schedule_note) && (
                                  <p className="truncate text-xs text-text-secondary">
                                    {s.dosage}
                                    {s.dosage && s.schedule_note && " · "}
                                    {s.schedule_note}
                                  </p>
                                )}
                              </span>
                            </button>
                            <button onClick={() => deleteSupplement(s.id)} aria-label={`Remove ${s.name}`} className="flex-shrink-0 text-text-secondary transition-colors hover:text-error">
                              <Trash2 className="h-4 w-4" strokeWidth={2} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={() => setSupSheetOpen(true)}
          className="mt-4 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-sm font-medium text-text-secondary hover:border-border-strong hover:text-text"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Search supplements to add
        </button>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-1 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-blue-light" strokeWidth={2} />
          <h2 className="text-sm font-semibold text-text">Apple Health sync</h2>
        </div>
        <p className="mb-4 text-xs text-text-secondary">
          There&apos;s no direct web API into Apple Health, so sync works via an iOS Shortcut you build once: it reads today&apos;s steps and sleep from the Health app, then
          sends them to the URL below on a schedule (e.g. an automation each morning).
        </p>

        {syncToken ? (
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-secondary">POST URL</p>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2.5">
                <code className="min-w-0 flex-1 truncate text-xs text-text">{syncUrl}</code>
                <button onClick={copySyncUrl} aria-label="Copy URL" className="flex-shrink-0 text-text-secondary hover:text-text">
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-secondary">Headers</p>
              <code className="block rounded-xl border border-border bg-bg px-3 py-2.5 text-xs text-text">
                apikey: (your Supabase anon key)
                <br />
                Content-Type: application/json
              </code>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-secondary">JSON body</p>
              <code className="block whitespace-pre-wrap break-all rounded-xl border border-border bg-bg px-3 py-2.5 text-xs text-text">
                {`{\n  "p_token": "${syncToken.token}",\n  "p_log_date": "<today as YYYY-MM-DD>",\n  "p_steps": <number>,\n  "p_sleep_hours": <number>\n}`}
              </code>
            </div>
            <p className="text-xs text-text-secondary">
              In Shortcuts: &ldquo;Get Contents of URL&rdquo; → Method POST → set the headers and body above, using &ldquo;Text&rdquo; fields from your Health data for the numbers.
            </p>
            <Button variant="ghost" onClick={generateSyncToken} className="min-h-9 px-3 py-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Regenerate token
            </Button>
          </div>
        ) : (
          <Button onClick={generateSyncToken} variant="pill" className="min-h-10 px-4">
            Generate sync token
          </Button>
        )}
      </section>

      <Sheet open={logSheetOpen} onClose={() => setLogSheetOpen(false)} title="Log today">
        <form onSubmit={saveTodayLog} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Steps</label>
            <input
              type="number"
              inputMode="numeric"
              value={stepsForm}
              onChange={(e) => setStepsForm(e.target.value)}
              placeholder="e.g. 8500"
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Sleep (hours)</label>
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={sleepForm}
              onChange={(e) => setSleepForm(e.target.value)}
              placeholder="e.g. 7.5"
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Sleep quality</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setQualityForm(n)}
                  className={`flex h-10 flex-1 items-center justify-center rounded-xl border text-sm font-semibold transition-colors ${
                    qualityForm === n ? "border-blue bg-blue/15 text-blue-light" : "border-border text-text-secondary hover:text-text"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" block>
            Save
          </Button>
        </form>
      </Sheet>

      <Sheet open={supSheetOpen} onClose={() => setSupSheetOpen(false)} title="Add supplement">
        <form onSubmit={addSupplement} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Name</label>
            <input
              type="text"
              value={supForm.name}
              onChange={(e) => setSupForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Vitamin D3"
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Dosage</label>
            <input
              type="text"
              value={supForm.dosage}
              onChange={(e) => setSupForm((f) => ({ ...f, dosage: e.target.value }))}
              placeholder="e.g. 2000 IU"
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Schedule note (optional)</label>
            <input
              type="text"
              value={supForm.schedule_note}
              onChange={(e) => setSupForm((f) => ({ ...f, schedule_note: e.target.value }))}
              placeholder="e.g. With breakfast"
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">When</label>
            <div className="flex flex-wrap gap-2">
              {SLOT_ORDER.map((slot) => {
                const SlotIcon = SLOT_META[slot].icon;
                return (
                  <button
                    type="button"
                    key={slot}
                    onClick={() => setSupForm((f) => ({ ...f, time_slot: slot }))}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                      supForm.time_slot === slot ? "border-blue bg-blue/15 text-blue-light" : "border-border text-text-secondary hover:text-text"
                    )}
                  >
                    <SlotIcon className="h-3.5 w-3.5" strokeWidth={2} /> {SLOT_META[slot].label}
                  </button>
                );
              })}
            </div>
          </div>
          <Button type="submit" block>
            Add supplement
          </Button>
        </form>
      </Sheet>
    </div>
  );
}

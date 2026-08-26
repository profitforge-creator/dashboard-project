"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, History, Timer as TimerIcon } from "lucide-react";
import type { FocusSession, Goal } from "@/lib/supabase/types";
import { FocusSessionCard } from "@/components/FocusSessionCard";
import { MetricCard } from "@/components/MetricCard";
import { SegmentedControl } from "@/components/SegmentedControl";
import { EmptyState } from "@/components/EmptyState";
import { Sheet } from "@/components/Sheet";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { timeAgo } from "@/lib/utils";

const PRESETS = ["Deep Work", "School", "Gym", "Content", "Business", "Trading Research", "Prayer / Bible Study", "Wind Down"] as const;
const DURATIONS = [25, 45, 60, 90] as const;

interface FocusClientProps {
  activeSession: FocusSession | null;
  history: FocusSession[];
  goals: Goal[];
  weeklyFocusSeconds: number;
  weeklyCompletedCount: number;
}

export function FocusClient({ activeSession: initialSession, history, goals, weeklyFocusSeconds, weeklyCompletedCount }: FocusClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [session, setSession] = useState(initialSession);
  const [elapsed, setElapsed] = useState(initialSession?.actual_seconds ?? 0);
  const [preset, setPreset] = useState<string>(PRESETS[0]);
  const [minutes, setMinutes] = useState<number>(25);
  const [customMinutes, setCustomMinutes] = useState("");
  const [goalId, setGoalId] = useState<string>("");
  const [endSheetOpen, setEndSheetOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (session?.status === "running") {
      tickRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => {
        if (tickRef.current) clearInterval(tickRef.current);
      };
    }
  }, [session?.status]);

  useEffect(() => {
    if (session?.status !== "running") return;
    const sync = setInterval(async () => {
      const supabase = createClient();
      await supabase.from("focus_sessions").update({ actual_seconds: elapsed }).eq("id", session.id);
    }, 15000);
    return () => clearInterval(sync);
  }, [session, elapsed]);

  async function startSession() {
    const plannedMinutes = customMinutes ? Number(customMinutes) : minutes;
    if (!plannedMinutes || plannedMinutes <= 0) {
      toast("Enter a valid duration.", "error");
      return;
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("focus_sessions")
      .insert({
        user_id: user!.id,
        goal_id: goalId || null,
        preset,
        planned_minutes: plannedMinutes,
        actual_seconds: 0,
        status: "running",
      })
      .select()
      .single();
    if (error || !data) {
      toast("Could not start the session.", "error");
      return;
    }
    setSession(data as FocusSession);
    setElapsed(0);
    toast("Focus session started");
  }

  async function pauseSession() {
    if (!session) return;
    const supabase = createClient();
    await supabase.from("focus_sessions").update({ status: "paused", actual_seconds: elapsed }).eq("id", session.id);
    setSession({ ...session, status: "paused" });
  }

  async function resumeSession() {
    if (!session) return;
    const supabase = createClient();
    await supabase.from("focus_sessions").update({ status: "running" }).eq("id", session.id);
    setSession({ ...session, status: "running" });
  }

  function openEndSheet() {
    setEndSheetOpen(true);
  }

  async function confirmEnd() {
    if (!session) return;
    const supabase = createClient();
    await supabase
      .from("focus_sessions")
      .update({ status: "completed", actual_seconds: elapsed, ended_at: new Date().toISOString(), notes })
      .eq("id", session.id);
    setSession(null);
    setElapsed(0);
    setEndSheetOpen(false);
    setNotes("");
    toast("Session saved");
    router.refresh();
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Focus</h1>
        <p className="text-sm text-text-secondary">Protect a block of time and get it done.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard icon={TimerIcon} label="This week" value={Math.round(weeklyFocusSeconds / 60)} suffix="m" />
        <MetricCard icon={History} label="Sessions" value={weeklyCompletedCount} />
      </div>

      {session ? (
        <FocusSessionCard
          session={session}
          elapsedSeconds={elapsed}
          onPause={pauseSession}
          onResume={resumeSession}
          onEnd={openEndSheet}
        />
      ) : (
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-sm font-medium text-text">Session type</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  className={`min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors ${
                    preset === p ? "border-blue bg-blue/15 text-blue-light" : "border-border text-text-secondary hover:text-text"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-text">Duration</p>
            <SegmentedControl
              options={DURATIONS.map((d) => ({ value: String(d), label: `${d}m` }))}
              value={String(minutes)}
              onChange={(v) => {
                setMinutes(Number(v));
                setCustomMinutes("");
              }}
            />
            <input
              type="number"
              min={1}
              placeholder="Custom minutes"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              className="mt-2 min-h-10 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>

          {goals.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-text">Linked goal (optional)</p>
              <select
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="min-h-10 w-full rounded-xl border border-border bg-bg px-3.5 text-sm text-text outline-none focus:border-blue"
              >
                <option value="">None</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={startSession}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue text-[15px] font-semibold text-white transition-colors hover:bg-blue/90"
          >
            <Play className="h-4 w-4" strokeWidth={2} /> Start Focus
          </button>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-text">Session history</h2>
        {history.length ? (
          <div className="flex flex-col gap-2">
            {history.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text">{s.preset}</p>
                  <p className="text-xs text-text-secondary">{timeAgo(s.started_at)}</p>
                </div>
                <span className="font-mono text-sm text-text-secondary">{Math.round(s.actual_seconds / 60)}m</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={History} title="No sessions yet" description="Your completed focus sessions will show up here." />
        )}
      </section>

      <Sheet open={endSheetOpen} onClose={() => setEndSheetOpen(false)} title="End session">
        <p className="mb-3 text-sm text-text-secondary">Add a quick note before saving (optional).</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="What did you get done?"
          className="min-h-24 w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
        />
        <button
          onClick={confirmEnd}
          className="mt-4 min-h-11 w-full rounded-xl bg-blue text-sm font-semibold text-white transition-colors hover:bg-blue/90"
        >
          Save session
        </button>
      </Sheet>
    </div>
  );
}

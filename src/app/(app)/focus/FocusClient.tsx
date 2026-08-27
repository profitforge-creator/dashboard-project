"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, History, Timer as TimerIcon, Brain, GraduationCap, Dumbbell, Video, Briefcase, LineChart, BookOpen, Moon, Minus, Plus, Target } from "lucide-react";
import type { FocusSession, Goal } from "@/lib/supabase/types";
import { FocusSessionCard } from "@/components/FocusSessionCard";
import { MetricCard } from "@/components/MetricCard";
import { EmptyState } from "@/components/EmptyState";
import { Sheet } from "@/components/Sheet";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { timeAgo } from "@/lib/utils";

const PRESETS_META = [
  { name: "Deep Work", subtitle: "Heads-down block", icon: Brain },
  { name: "School", subtitle: "Study session", icon: GraduationCap },
  { name: "Gym", subtitle: "Training block", icon: Dumbbell },
  { name: "Content", subtitle: "Create & ship", icon: Video },
  { name: "Business", subtitle: "Build & operate", icon: Briefcase },
  { name: "Trading Research", subtitle: "Charts & analysis", icon: LineChart },
  { name: "Prayer / Bible Study", subtitle: "Quiet time", icon: BookOpen },
  { name: "Wind Down", subtitle: "Ease into rest", icon: Moon },
] as const;
const MIN_MINUTES = 5;
const MAX_MINUTES = 240;
const MINUTE_STEP = 5;

function formatCountdown(totalMinutes: number) {
  return `${String(totalMinutes).padStart(2, "0")}:00`;
}

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
  const [preset, setPreset] = useState<string>(PRESETS_META[0].name);
  const [minutes, setMinutes] = useState<number>(25);
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
    const plannedMinutes = minutes;
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
        <div className="space-y-5">
          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center justify-center rounded-2xl border border-blue/20 bg-bg/60 py-8">
              <p
                className="font-mono text-6xl font-bold tabular-nums text-blue-light"
                style={{ textShadow: "0 0 24px rgba(99, 199, 255, 0.45), 0 0 4px rgba(99, 199, 255, 0.6)" }}
              >
                {formatCountdown(minutes)}
              </p>
            </div>

            <div className="mx-auto mt-5 flex w-fit items-center gap-1 rounded-full border border-border-strong bg-card-secondary p-1">
              <button
                onClick={() => setMinutes((m) => Math.max(MIN_MINUTES, m - MINUTE_STEP))}
                aria-label="Decrease duration"
                className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-card hover:text-text"
              >
                <Minus className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <span className="w-20 text-center text-sm font-semibold text-text">{minutes}m</span>
              <button
                onClick={() => setMinutes((m) => Math.min(MAX_MINUTES, m + MINUTE_STEP))}
                aria-label="Increase duration"
                className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-card hover:text-text"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>

            <button
              onClick={startSession}
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-blue text-[15px] font-semibold text-white transition-colors hover:bg-blue/90"
            >
              <Play className="h-4 w-4" strokeWidth={2} /> Start
            </button>

            {goals.length > 0 && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border-strong bg-card-secondary px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Target className="h-4 w-4 flex-shrink-0 text-text-secondary" strokeWidth={2} />
                  <span className="text-sm text-text">Linked goal</span>
                </div>
                <select
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                  className="min-w-0 max-w-[55%] rounded-full border-none bg-transparent text-right text-sm font-medium text-text-secondary outline-none"
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
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-text">Session type</p>
            <div className="grid grid-cols-2 gap-3">
              {PRESETS_META.map((p) => {
                const Icon = p.icon;
                const active = preset === p.name;
                return (
                  <button
                    key={p.name}
                    onClick={() => setPreset(p.name)}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      active ? "border-blue/50 bg-blue/10" : "border-border bg-card hover:border-border-strong"
                    }`}
                  >
                    <span
                      className={`mb-3 flex h-9 w-9 items-center justify-center rounded-full ${
                        active ? "bg-blue/20 text-blue-light" : "bg-card-secondary text-text-secondary"
                      }`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <p className="text-sm font-semibold text-text">{p.name}</p>
                    <p className="mt-0.5 truncate text-xs text-text-secondary">{p.subtitle}</p>
                  </button>
                );
              })}
            </div>
          </div>
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

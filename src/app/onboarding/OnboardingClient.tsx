"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Zap, Heart, Moon, Flame, HeartPulse, Briefcase, Wallet, Sparkle, Bell, BellOff, Sun, Monitor } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { CoachingPersonality, GoalCategory } from "@/lib/supabase/types";

type Answers = {
  full_name: string;
  coaching_personality: CoachingPersonality | "";
  wake_phrase: string;
  focus_areas: GoalCategory[];
  notifications_enabled: boolean | null;
  appearance: "dark" | "light" | "system" | "";
};

const STEPS = ["name", "personality", "wake_phrase", "focus_areas", "notifications", "appearance", "review"] as const;

const GROUPS: { label: string; steps: (typeof STEPS)[number][] }[] = [
  { label: "About you", steps: ["name", "personality", "wake_phrase"] },
  { label: "What you need", steps: ["focus_areas", "notifications"] },
  { label: "How I show up", steps: ["appearance", "review"] },
];

const PERSONALITY_META: Record<CoachingPersonality, { label: string; icon: LucideIcon }> = {
  direct: { label: "Direct", icon: Zap },
  encouraging: { label: "Encouraging", icon: Heart },
  calm: { label: "Calm", icon: Moon },
  tough_love: { label: "Tough love", icon: Flame },
};

const FOCUS_META: Record<GoalCategory, { label: string; icon: LucideIcon }> = {
  health: { label: "Health", icon: HeartPulse },
  business: { label: "Business", icon: Briefcase },
  financial: { label: "Financial", icon: Wallet },
  spiritual: { label: "Spiritual", icon: Sparkle },
  general: { label: "General", icon: Sparkle },
};

const APPEARANCE_META: Record<"dark" | "light" | "system", { label: string; icon: LucideIcon }> = {
  dark: { label: "Dark", icon: Moon },
  light: { label: "Light", icon: Sun },
  system: { label: "System", icon: Monitor },
};

export function OnboardingClient({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<Answers>({
    full_name: "",
    coaching_personality: "",
    wake_phrase: "Hey Amari",
    focus_areas: [],
    notifications_enabled: null,
    appearance: "dark",
  });

  const key = STEPS[step];
  const groupIndex = GROUPS.findIndex((g) => g.steps.includes(key));
  const stepsInGroup = GROUPS[groupIndex].steps;
  const groupProgress = (stepsInGroup.indexOf(key) + 1) / stepsInGroup.length;

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  }
  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  async function finish() {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({
        full_name: answers.full_name || null,
        coaching_personality: (answers.coaching_personality || "direct") as CoachingPersonality,
        wake_phrase: answers.wake_phrase || "Hey Amari",
        notifications_enabled: answers.notifications_enabled ?? true,
        appearance: answers.appearance || "dark",
        onboarding_completed: true,
      })
      .eq("id", userId);

    const responses = [
      { question_key: "full_name", answer: answers.full_name },
      { question_key: "coaching_personality", answer: answers.coaching_personality },
      { question_key: "wake_phrase", answer: answers.wake_phrase },
      { question_key: "focus_areas", answer: answers.focus_areas },
      { question_key: "notifications_enabled", answer: answers.notifications_enabled },
      { question_key: "appearance", answer: answers.appearance },
    ];
    await supabase.from("onboarding_responses").upsert(
      responses.map((r) => ({ user_id: userId, ...r })),
      { onConflict: "user_id,question_key" }
    );

    router.push("/home");
    router.refresh();
  }

  const canContinue =
    key === "name" ? true :
    key === "personality" ? !!answers.coaching_personality :
    key === "wake_phrase" ? answers.wake_phrase.trim().length > 0 :
    key === "focus_areas" ? true :
    key === "notifications" ? answers.notifications_enabled !== null :
    key === "appearance" ? !!answers.appearance :
    true;

  return (
    <main className="flex min-h-dvh flex-col bg-bg px-6 pb-6 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="mb-10 flex items-center gap-2">
          {GROUPS.map((g, i) => (
            <div key={g.label} className="flex-1">
              <p className={cn("label-mono mb-1.5 truncate", i === groupIndex ? "text-blue-light" : "text-text-secondary/50")}>{g.label}</p>
              <div className="h-[3px] overflow-hidden rounded-full bg-card">
                <div
                  className="h-full rounded-full bg-blue transition-all duration-300"
                  style={{ width: i < groupIndex ? "100%" : i === groupIndex ? `${groupProgress * 100}%` : "0%" }}
                />
              </div>
            </div>
          ))}
        </div>

        <div key={key} className="flex-1 animate-fade-in">
          {key === "name" && (
            <QuestionStep title="What should Amari call you?" subtitle="Used for a personal greeting on your Home screen.">
              <input
                id="onboarding-name"
                name="name"
                type="text"
                autoFocus
                value={answers.full_name}
                onChange={(e) => setAnswers((a) => ({ ...a, full_name: e.target.value }))}
                placeholder={email.split("@")[0]}
                className="min-h-14 w-full rounded-2xl border border-border bg-card px-4 text-lg text-text outline-none focus:border-blue"
              />
            </QuestionStep>
          )}

          {key === "personality" && (
            <QuestionStep title="How should Amari coach you?" subtitle="You can change this any time in Profile.">
              <div className="flex flex-wrap gap-2.5">
                {(Object.keys(PERSONALITY_META) as CoachingPersonality[]).map((p) => (
                  <OptionPill
                    key={p}
                    selected={answers.coaching_personality === p}
                    onClick={() => setAnswers((a) => ({ ...a, coaching_personality: p }))}
                    label={PERSONALITY_META[p].label}
                    icon={PERSONALITY_META[p].icon}
                  />
                ))}
              </div>
            </QuestionStep>
          )}

          {key === "wake_phrase" && (
            <QuestionStep title="What should wake Amari up?" subtitle="A phrase for voice activation, once AI voice is connected.">
              <input
                id="onboarding-wake-phrase"
                name="wake_phrase"
                type="text"
                autoFocus
                value={answers.wake_phrase}
                onChange={(e) => setAnswers((a) => ({ ...a, wake_phrase: e.target.value }))}
                className="min-h-14 w-full rounded-2xl border border-border bg-card px-4 text-lg text-text outline-none focus:border-blue"
              />
            </QuestionStep>
          )}

          {key === "focus_areas" && (
            <QuestionStep title="What matters most right now?" subtitle="Pick as many as apply — you can add goals for these later.">
              <div className="flex flex-wrap gap-2.5">
                {(["health", "business", "financial", "spiritual"] as GoalCategory[]).map((c) => (
                  <OptionPill
                    key={c}
                    selected={answers.focus_areas.includes(c)}
                    onClick={() =>
                      setAnswers((a) => ({
                        ...a,
                        focus_areas: a.focus_areas.includes(c) ? a.focus_areas.filter((x) => x !== c) : [...a.focus_areas, c],
                      }))
                    }
                    label={FOCUS_META[c].label}
                    icon={FOCUS_META[c].icon}
                  />
                ))}
              </div>
            </QuestionStep>
          )}

          {key === "notifications" && (
            <QuestionStep title="Enable notifications?" subtitle="Reminders for focus sessions and upcoming deadlines.">
              <div className="flex flex-wrap gap-2.5">
                <OptionPill selected={answers.notifications_enabled === true} onClick={() => setAnswers((a) => ({ ...a, notifications_enabled: true }))} label="Yes, enable" icon={Bell} />
                <OptionPill selected={answers.notifications_enabled === false} onClick={() => setAnswers((a) => ({ ...a, notifications_enabled: false }))} label="Not now" icon={BellOff} />
              </div>
            </QuestionStep>
          )}

          {key === "appearance" && (
            <QuestionStep title="Pick an appearance" subtitle="You can change this any time in Profile.">
              <div className="flex flex-wrap gap-2.5">
                {(["dark", "light", "system"] as const).map((a) => (
                  <OptionPill key={a} selected={answers.appearance === a} onClick={() => setAnswers((s) => ({ ...s, appearance: a }))} label={APPEARANCE_META[a].label} icon={APPEARANCE_META[a].icon} />
                ))}
              </div>
            </QuestionStep>
          )}

          {key === "review" && (
            <QuestionStep title="Ready to go" subtitle="Here's what Amari will remember.">
              <div className="space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
                <ReviewRow label="Name" value={answers.full_name || email.split("@")[0]} />
                <ReviewRow label="Coaching" value={answers.coaching_personality || "direct"} />
                <ReviewRow label="Wake phrase" value={answers.wake_phrase} />
                <ReviewRow label="Focus areas" value={answers.focus_areas.join(", ") || "None yet"} />
                <ReviewRow label="Notifications" value={answers.notifications_enabled ? "Enabled" : "Off"} />
                <ReviewRow label="Appearance" value={answers.appearance} />
              </div>
            </QuestionStep>
          )}
        </div>

        <div className="sticky bottom-6 mt-8 flex items-center justify-between gap-4">
          <button
            onClick={back}
            className={cn("label-mono text-text-secondary transition-opacity hover:text-text", step === 0 && "pointer-events-none opacity-0")}
          >
            back
          </button>
          <button
            onClick={key === "review" ? finish : next}
            disabled={!canContinue || saving}
            className="flex min-h-12 items-center gap-2 rounded-full bg-blue px-6 text-sm font-semibold text-bg transition-colors hover:bg-blue/90 disabled:opacity-40"
          >
            {key === "review" ? (saving ? "Saving…" : "Enter Amari") : "Continue"}
            {key !== "review" && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
          </button>
        </div>
      </div>
    </main>
  );
}

function QuestionStep({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-[28px] italic leading-tight text-text" style={{ fontFamily: "var(--font-serif)" }}>
        {title}
      </h1>
      <p className="mt-2 text-sm italic text-blue-light">{subtitle}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function OptionPill({ selected, onClick, label, icon: Icon }: { selected: boolean; onClick: () => void; label: string; icon: LucideIcon }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex min-h-12 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
        selected ? "border-blue bg-blue/15 text-blue-light" : "border-border bg-card text-text hover:border-border-strong"
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
      {label}
    </button>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary">{label}</span>
      <span className="font-medium capitalize text-text">{value}</span>
    </div>
  );
}

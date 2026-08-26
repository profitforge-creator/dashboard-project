"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
  const progress = ((step + 1) / STEPS.length) * 100;

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
    <main className="flex min-h-dvh flex-col bg-bg px-6 py-6">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="mb-8 flex items-center gap-3">
          <button
            onClick={back}
            disabled={step === 0}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-opacity disabled:opacity-0"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          </button>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-card">
            <div className="h-full rounded-full bg-blue transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
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
              <div className="grid grid-cols-2 gap-3">
                {(["direct", "encouraging", "calm", "tough_love"] as CoachingPersonality[]).map((p) => (
                  <OptionButton
                    key={p}
                    selected={answers.coaching_personality === p}
                    onClick={() => setAnswers((a) => ({ ...a, coaching_personality: p }))}
                    label={p === "tough_love" ? "Tough love" : p[0].toUpperCase() + p.slice(1)}
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
              <div className="grid grid-cols-2 gap-3">
                {(["health", "business", "financial", "spiritual"] as GoalCategory[]).map((c) => (
                  <OptionButton
                    key={c}
                    selected={answers.focus_areas.includes(c)}
                    onClick={() =>
                      setAnswers((a) => ({
                        ...a,
                        focus_areas: a.focus_areas.includes(c) ? a.focus_areas.filter((x) => x !== c) : [...a.focus_areas, c],
                      }))
                    }
                    label={c[0].toUpperCase() + c.slice(1)}
                  />
                ))}
              </div>
            </QuestionStep>
          )}

          {key === "notifications" && (
            <QuestionStep title="Enable notifications?" subtitle="Reminders for focus sessions and upcoming deadlines.">
              <div className="grid grid-cols-2 gap-3">
                <OptionButton selected={answers.notifications_enabled === true} onClick={() => setAnswers((a) => ({ ...a, notifications_enabled: true }))} label="Yes, enable" />
                <OptionButton selected={answers.notifications_enabled === false} onClick={() => setAnswers((a) => ({ ...a, notifications_enabled: false }))} label="Not now" />
              </div>
            </QuestionStep>
          )}

          {key === "appearance" && (
            <QuestionStep title="Pick an appearance" subtitle="You can change this any time in Profile.">
              <div className="grid grid-cols-3 gap-3">
                {(["dark", "light", "system"] as const).map((a) => (
                  <OptionButton key={a} selected={answers.appearance === a} onClick={() => setAnswers((s) => ({ ...s, appearance: a }))} label={a[0].toUpperCase() + a.slice(1)} />
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

        <button
          onClick={key === "review" ? finish : next}
          disabled={!canContinue || saving}
          className="sticky bottom-6 mt-8 min-h-14 w-full rounded-2xl bg-blue text-[15px] font-semibold text-white transition-colors hover:bg-blue/90 disabled:opacity-40"
        >
          {key === "review" ? (saving ? "Saving…" : "Enter Amari") : "Continue"}
        </button>
      </div>
    </main>
  );
}

function QuestionStep({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-[26px] font-semibold leading-tight text-text">{title}</h1>
      <p className="mt-2 text-sm text-text-secondary">{subtitle}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function OptionButton({ selected, onClick, label }: { selected: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-14 rounded-2xl border px-4 text-sm font-semibold transition-colors ${
        selected ? "border-blue bg-blue/15 text-blue-light" : "border-border bg-card text-text hover:border-border-strong"
      }`}
    >
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
